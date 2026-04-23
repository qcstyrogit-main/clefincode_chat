import { renderEmoji, parseMessageTwemoji, twemojiUrl } from "./emoji_picker";

export default class TypeMessageInput {
  constructor(opts) {
    this.wrapper = `<textarea class='cc-type-message-input type-message' placeholder='Type a message...' rows='1'></textarea>`;
    this.chat_space = opts.chat_space;

    setTimeout(() => {
      this.make_input();
    }, 500);
  }

  make_input() {
    this.$input = this.chat_space.$chat_actions.find(".cc-type-message-input");
    this.input = this.$input[0];
    if (this.input) {
      this.input.focus();
    }
    this.setup_events();
    setTimeout(() => this.sync_height(), 100);
  }

  set_value(val) {
    if (this.$input) {
      this.$input.val(val);
      this.sync_height();
    }
  }

  get_value() {
    return this.$input ? this.$input.val() : "";
  }

  insert_emoji(emoji) {
    if (!this.input) return;
    const start = this.input.selectionStart;
    const end = this.input.selectionEnd;
    const text = this.input.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    this.input.value = before + emoji + after;
    this.input.selectionStart = this.input.selectionEnd = start + emoji.length;
    this.input.focus();
    this.sync_height();
    
    if (this.chat_space && this.chat_space.toggle_voice_clip_icon) {
      this.chat_space.toggle_voice_clip_icon();
    }
  }

  setup_events() {
    const me = this;
    if (!this.$input) return;

    this.$input.on("input", () => {
      me.sync_height();
      if (me.chat_space && me.chat_space.toggle_voice_clip_icon) {
        me.chat_space.toggle_voice_clip_icon();
      }
    });

    this.$input.on("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // erpnext_chat_space.js handles the send logic on .type-message keydown
        // we just need to ensure sync_height is called if needed, but it's handled by 'input'
      }
    });
  }

  sync_height() {
    if (!this.input) return;

    const $pill = this.chat_space &&
      this.chat_space.$chat_actions &&
      this.chat_space.$chat_actions.find(".cc-input-pill");

    if (!$pill || !$pill.length) return;

    // Reset height to auto to get the correct scrollHeight
    this.input.style.height = 'auto';
    
    const scroll_h = this.input.scrollHeight;
    const max_h = 120;
    
    // Set new height capped at max_h
    const new_h = Math.min(scroll_h, max_h);
    this.input.style.height = new_h + 'px';
    
    // Enable/disable scrolling
    this.input.style.overflowY = scroll_h > max_h ? 'auto' : 'hidden';

    // Check if it's multiline (roughly more than one line height)
    const is_multiline = scroll_h > 40; 

    $pill.toggleClass("is-expanded", is_multiline);
    if (is_multiline) {
      $pill.css("border-radius", "18px");
    } else {
      $pill.css("border-radius", "20px");
    }
    // Ensure vertical alignment stays at the bottom
    $pill.css("align-items", "flex-end");
  }

  clear() {
    if (this.$input) {
      this.$input.val("");
      this.sync_height();
    }
  }
}
