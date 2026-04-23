import Quill from "quill";
import Mention from "../quill-mention/quill.mention";
import { renderEmoji, parseMessageTwemoji, twemojiUrl } from "./emoji_picker";

const Embed = Quill.import("blots/embed");

class EmojiBlot extends Embed {
  static blotName = "ccemoji";
  static tagName = "img";

  static create(value) {
    let node = super.create();
    if (typeof value === "string") {
      node.setAttribute("src", twemojiUrl(value));
      node.setAttribute("data-emoji", value);
      node.setAttribute("alt", value);
      node.setAttribute("draggable", "false");
      node.setAttribute("class", "cc-twemoji-input");
    }
    return node;
  }

  static value(node) {
    return node.getAttribute("data-emoji");
  }
}

Quill.register(EmojiBlot);
Quill.register("modules/mention", Mention, true);

export default class TypeMessageInput {
  constructor(opts) {
    this.wrapper = `<div class='form-control type-message'></div>`;
    this.chat_space = opts.chat_space;

    setTimeout(() => {
      this.make_quill_editor();
    }, 500);
  }

  make_quill_editor() {
    if (this.quill) return;
    this.quill = new Quill(
      this.chat_space.$chat_actions.find(".type-message")[0],
      this.get_quill_options()
      
    );
    $(this.chat_space.$chat_actions.find(".type-message")[0])
    .find(".ql-editor")
    .addClass("input-message");
    this.quill.focus();
    this.setup_events();
    this.sync_height();
  }

  insert_emoji(emoji) {
    try {
      const range = this.quill.getSelection(true);
      if (range) {
        this.quill.insertEmbed(range.index, "ccemoji", emoji, "user");
        this.quill.setSelection(range.index + 1, "silent");
      } else {
        const length = this.quill.getLength();
        this.quill.insertEmbed(length - 1, "ccemoji", emoji, "user");
      }
      this.sync_height();
    } catch (err) {
      console.error("ClefinCode Chat: Failed to insert emoji", err);
    }
  }

  get_quill_options() {
    const me = this;
    return {
      modules: {
        mention: this.get_mention_options(),
      },
    };
  }

  setup_events() {
    const me = this;

    // Monitor text changes for automatic emoji conversion (Typing)
    this.quill.on("text-change", (delta, oldDelta, source) => {
      if (source !== "user") return;

      const text = me.quill.getText();
      const emojiRegex = /((\ud83c[\udde6-\uddff]){2}|[\u2700-\u27bf]|(?:\ud83c[\udf00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udc00-\udfff])(?:[\ufe0f\u200d](?:\ud83c[\udf00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udc00-\udfff]))*|[\u2000-\u3fff])/g;
      
      let match;
      while ((match = emojiRegex.exec(text)) !== null) {
        const emoji = match[0];
        const index = match.index;
        if (emoji.length === 1 && emoji.charCodeAt(0) < 200) continue;

        setTimeout(() => {
          me.quill.deleteText(index, emoji.length, "silent");
          me.quill.insertEmbed(index, "ccemoji", emoji, "silent");
        }, 0);
      }

      me.sync_height();
      if (me.chat_space && me.chat_space.toggle_voice_clip_icon) {
        me.chat_space.toggle_voice_clip_icon();
      }
    });

    // Handle Pasting (Matcher)
    const TEXT_NODE = 3; // Standard Node.TEXT_NODE
    this.quill.clipboard.addMatcher(TEXT_NODE, (node, delta) => {
      const regex = /((\ud83c[\udde6-\uddff]){2}|[\u2700-\u27bf]|(?:\ud83c[\udf00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udc00-\udfff])(?:[\ufe0f\u200d](?:\ud83c[\udf00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udc00-\udfff]))*|[\u2000-\u3fff])/g;
      if (typeof node.data !== "string") return delta;

      const ops = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(node.data)) !== null) {
        const emoji = match[0];
        if (emoji.length === 1 && emoji.charCodeAt(0) < 200) continue;

        const index = match.index;
        if (index > lastIndex) {
          ops.push({ insert: node.data.substring(lastIndex, index) });
        }
        ops.push({ insert: { ccemoji: emoji } });
        lastIndex = index + emoji.length;
      }

      if (lastIndex < node.data.length) {
        ops.push({ insert: node.data.substring(lastIndex) });
      }

      return new (Quill.import("delta"))(ops);
    });
  }

  sync_height() {
    if (!this.quill || !this.quill.root) return;

    const editor = this.quill.root;
    const min_height = 34;
    const max_height = 120;
    const has_content = editor.textContent
      ? editor.textContent.replace(/\u200b/g, "").trim().length > 0
      : false;

    editor.style.height = "auto";
    editor.style.overflowY = "hidden";

    const scroll_height = Math.max(editor.scrollHeight, min_height);
    const next_height = Math.min(scroll_height, max_height);
    const shell = this.chat_space && this.chat_space.$chat_actions
      ? this.chat_space.$chat_actions.find(".cc-composer-shell")
      : null;

    editor.style.height = `${next_height}px`;
    editor.style.overflowY = scroll_height > max_height ? "auto" : "hidden";

    if (shell && shell.length) {
      shell.removeClass("is-default is-expanded is-overflow");
      if (!has_content || scroll_height <= min_height) {
        shell.addClass("is-default");
      } else if (scroll_height > min_height && scroll_height <= max_height) {
        shell.addClass("is-expanded");
      } else {
        shell.addClass("is-overflow");
      }
    }

    if (this.chat_space && this.chat_space.$chat_actions) {
      this.chat_space.$chat_actions
        .find(".cc-input-pill")
        .toggleClass("is-expanded", next_height > min_height);
    }
  }

  clear() {
    if (!this.quill) return;
    this.quill.setText("");
    this.sync_height();
  }

  get_mention_options() {
    const chat_space = this.chat_space;
    return {
      allowedChars: /^[A-Za-z0-9_:\s-]*$/,
      minChars: 0,
      mentionDenotationChars: ["@"],
      isolateCharacter: true,
      defaultMenuOrientation: "top",
      source: frappe.utils.debounce(async function (search_term, renderList) {
        let method = "clefincode_chat.api.api_1_3_1.api.get_names_for_mentions";
        let values = await frappe.xcall(method, {
          search_term : search_term , room : chat_space.profile.room
        });
        renderList(values, search_term);
      }, 300),
      renderItem(item) {
        let value = item.value;
        return `${value} ${
          item.is_doctype != 1 ? frappe.utils.icon("assign") : ``
        }`;
      },
    };
  }
}
