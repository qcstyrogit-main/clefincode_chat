
import {
  scroll_to_bottom,
  get_date_from_now,
  get_time,
  is_date_change,
  is_image,
  is_video,
  is_audio,
  is_document,
  is_voice_clip,
  get_avatar_html,
  mark_messsages_as_read,
  contains_arabic,
  check_if_chat_window_open,
  get_profile_full_name,
  convertToUTC,
  send_message,
  create_sub_channel,
  get_time_now,
  get_chat_members,
  check_if_contributor_active,
  hide_overlay,
  show_overlay,
  convert_emoticons_to_emojis,
} from "./erpnext_chat_utils";
import { check_if_contact_has_chat } from "./erpnext_chat_contact";
import TypeMessageInput from "./type_message_input";
import TagBlot from "./tag_blot";
import ChatInfo from "./erpnext_chat_info";
import VoiceClip from "./voice_clip_widget";
import ChatWindow from "./erpnext_chat_window";
import { add_group_member, create_group } from "./erpnext_chat_contact_list";
import EmojiPicker, { renderEmoji, parseMessageTwemoji } from "./emoji_picker";


export default class ChatSpace {
  constructor(opts) {
    this.$wrapper = opts.$wrapper;
    this.profile = opts.profile;
    this.$chat_room = opts.$chat_room;
    this.new_group = opts.new_group;
    this.chat_list = opts.chat_list;
    this.file = null;
    this.is_open = 1;
    this.typing = false;
    this.is_first_message = 0;
    this.lastScrollTop = 0;
    this.scrollUpThresholdPercent = 90;
    this.bottomThresholdPercent = 25;
    this.audiodict = [];
    this.messages_limit = 10;
    this.messages_offset = 0;
    this.isTypingIndicatorActive = false;
    this.typingTimeout = false;
    this.contributors = [];
    this.reference_doctypes = [];
    this.online_timeout = null;
    this.is_disk = "desk" in frappe;  
    this.reply_to_message = null; 

    // open chat space for showing topic information
    this.chat_topic_space = opts.chat_topic;
    this.chat_topic_channel = opts.chat_topic_channel;
    this.is_private_topic = opts.is_private_topic;
    this.chat_topic_space_subject = opts.chat_topic_subject;
    this.alternative_subject = opts.alternative_subject;
    this.not_authorized_user = false;
    this.chat_status = opts.chat_status;




    if (this.chat_topic_space) {
      this.profile.room_type = "Topic";
    }

    if (this.profile.room_type != "Topic") {
      if (this.profile.room_type == "Contributor") {
        frappe.ErpnextChat.settings.open_chat_space_rooms.push(
          this.profile.parent_channel
        );
      } else {
        frappe.ErpnextChat.settings.open_chat_space_rooms.push(
          this.profile.room
        );
      }
    }

    this.setup();
  }
  
  

  async get_platform_icon() {
    const platform = this.profile.platform
    let platform_icon = "";
  
    if (platform === "WhatsApp" && this.profile.room_type === "Direct") {
      platform_icon = `<img title="${this.default_whatsapp_number}" src="/assets/clefincode_chat/icons/whatsapp.svg" style="margin-right:8px; margin-left:8px;">`;
    } else if (platform === "Instagram" && this.profile.room_type === "Direct") {
      platform_icon = `<img title="Instagram" src="/assets/clefincode_chat/icons/instagram.svg" style="margin-right:8px; width:20px; height:20px; margin-left:8px;">`;
    } else if (platform === "Messenger" && this.profile.room_type === "Direct") {
      platform_icon = `<img title="Messenger" src="/assets/clefincode_chat/icons/messenger.svg" style="margin-right:8px; width:20px; height:20px; margin-left:8px;">`;
    } else if (platform === "Chat" && this.profile.room_type === "Direct") {
      platform_icon = `<svg class="icon icon-lg" style="margin-right:8px; width:20px; height:20px; margin-left:8px;"><use href="#icon-small-message"></use></svg>`;
    } else if (platform === "Telegram" && this.profile.room_type === "Direct") {
      platform_icon = `<img title="Telegram" src="/assets/clefincode_chat/icons/telegram.svg" style="margin-right:6px; width:25px; margin-left:8px;">`;
    }
  
    return platform_icon;
  }

  async setup() {
    if (this.profile.room_type == "Direct") {
      this.$chat_space = $(document.createElement("div")).addClass(
        "chat-space delete-sender-name"
      );
    } else {
      this.$chat_space = $(document.createElement("div")).addClass(
        "chat-space"
      );
    }
    this.setup_chat_window();
    await this.setup_header();
    this.get_chat_members();

    // Initialize skeleton UI immediately
    await this.setup_messages([]);
    await this.setup_actions();
    this.render();

    if (this.profile.user === "Guest") {
      this.setup_socketio();
    } else if (this.profile.room && this.new_group != 1) {
      await this.get_sub_channels_info();
    }

    if (this.chat_topic_space && this.is_private_topic == 1) {
      const res = await check_if_user_has_permission(
        this.profile.user_email,
        this.chat_topic_space,
        this.chat_topic_channel
      );
      const res2 = await check_if_user_send_request(
        this.profile.user_email,
        this.chat_topic_space
      );

      if (res2) {
        this.$chat_space_container = $(document.createElement("div")).addClass(
          "chat-space-container chat-space-center"
        );
        this.$chat_space.append(this.$chat_space_container);
        this.$chat_space_container.append(
          `<div class="alert alert-secondary no-messages-info">Your request has been sent</div>`
        );
        this.render();
        return;
      }
      if (!res && !res2) {
        this.request_for_access_topic();
        return;
      }      
    }
    this.profile.room || this.chat_topic_space
      ? await this.fetch_and_setup_messages()
      : this.setup_socketio(); // Suppressed: no "No messages" placeholder
    await this.get_topic_info();
  }

  setup_chat_window() {
    var screen_width = $("body").outerWidth();
    var right_width = $(".chat_right_section").outerWidth();
    var left_width = $(".chat_left_section").outerWidth();
    if (right_width + left_width > screen_width) {
      if (screen_width < 750) {
        $(".close-chat-list").click();
        if (left_width > screen_width) {
          $(".chat-window").each(function (index) {
            if ($(this).css("display") != "none") {
              $(".collapse-chat-window")[index].click();
              return false;
            }
          });
        }
      } else {
        $(".chat-window").each(function (index) {
          if ($(this).css("display") != "none") {
            $(".collapse-chat-window")[index].click();
            return false;
          }
        });
      }
    }
  }

  async setup_header() {
    let header_title;
    let header_full_name;

    if (this.chat_topic_space) {
        this.avatar_html = "";
        header_title = this.chat_topic_space_subject
            ? this.chat_topic_space_subject.replace(/"/g, "")
            : this.alternative_subject;
        header_full_name = header_title;
        header_title = header_title.length > 25 ? header_title.substring(0, 25) + "..." : header_title;
    } else {
        this.avatar_html = get_avatar_html(this.profile.room_name, this.profile.room_type);
        header_full_name = this.profile.room_name;
        header_title = this.profile.room_name.length > 20 ? this.profile.room_name.substring(0, 20) + "..." : this.profile.room_name;
    }

    let last_active = "";
    let user_datetime = "";

    if (this.profile.room_type === "Direct") {
        const last_active_value = await get_last_active(this.profile.contact, this.profile.user_email);
        if (last_active_value) {
            last_active =
                get_date_from_now(last_active_value, "space", this.profile.time_zone) +
                " " +
                get_time(last_active_value, this.profile.time_zone);
            const current_user_datetime = await get_time_now(this.profile.user_email);
            user_datetime =
                get_date_from_now(current_user_datetime, "space", this.profile.time_zone) +
                " " +
                get_time(current_user_datetime, this.profile.time_zone);
        }
    }
    

    const icon_html = await this.get_platform_icon();

    const header_html = `
        <div class='chat-header'>
            ${this.avatar_html}
            <div class='chat-profile-info'>
                <div class='chat-profile-name' title="${header_full_name}">${header_title}</div>
                <div class='chat-profile-status'>${last_active !== user_datetime ? last_active : ""}</div>
            </div>
            ${icon_html}
            ${
                this.profile.is_admin === true && this.profile.room_type !== "Topic"
                    ? `<span class='collapse-chat-window'>${frappe.utils.icon("collapse", "md")}</span>`
                    : ``
            }
            ${
                this.profile.is_admin === true
                    ? `<span class='close-chat-window'>${frappe.utils.icon("close", "lg")}</span>`
                    : ``
            }
        </div>
    `;


    this.$chat_space.append(header_html);

    if (
        this.profile.room_type === "Direct" &&
        last_active &&
        user_datetime &&
        last_active === user_datetime
    ) {
        this.set_online();
    }
}


  async get_sub_channels_info() {
    await this.get_last_active_sub_channel();
    if (
      this.profile.room_type != "Contributor" &&
      !this.last_active_sub_channel
    ) {
      this.setup_socketio();
      return;
    }

    if (
      this.profile.room_type == "Contributor" &&
      this.last_active_sub_channel
    ) {
      this.contributors = await get_sub_channel_members(
        this.last_active_sub_channel,
        this.profile.user_email
      );
    } else {
      this.contributors = await get_contributors(this.profile.room);
    }
    this.$chat_space.removeClass("delete-sender-name");
    this.setup_socketio();
  }

  async fetch_and_setup_messages() {
    try {
      let res;
      // if(!this.profile.room || !this.chat_topic_space) return;

      if (this.new_group == 1) {
        this.$chat_space_container = $(document.createElement("div")).addClass(
          "chat-space-container"
        );
        this.$chat_space.append(this.$chat_space_container);

        const scroll_arrow = `
          <div class='arrow-button'>
          <button class='arrow'>
            <span data-icon="down" class="btn-ar">
              <svg viewBox="0 0 19 20" height="20" width="19" preserveAspectRatio="xMidYMid meet" class="" version="1.1" x="0px" y="0px"><path fill="currentColor" d="M3.8,6.7l5.7,5.7l5.7-5.7l1.6,1.6l-7.3,7.2L2.2,8.3L3.8,6.7z"></path></svg>
            </span>
          </button>
          </div>
      `;
        this.$chat_space_container.append(scroll_arrow);
        const content = `
      <div class="create-group" data-template = "create_group_template">
      <span class="sender-user" data-user="${this.profile.user_email}"></span><span> created this group </span>
      </div>
      `;

        const message_info = {
          content: content,
          user: this.profile.user,
          room: this.profile.room,
          email: this.profile.user_email,
          is_first_message: 1,
          message_type: "information",
          message_template_type: "Create Group",
        };
        send_message(message_info);

        await this.setup_actions();
        this.render();
        this.setup_socketio();
        return;
      }

      await this.get_all_sub_channels_for_contributor();
      if (this.profile.room_type == "Contributor") {
        res = await get_messages(
          this.all_sub_channels_for_contributor,
          this.profile.user_email,
          this.profile.room_type,
          null,
          null,
          this.messages_limit,
          this.messages_offset
        );
      } else if (this.profile.room_type == "Topic") {
        res = await get_messages(
          "",
          this.profile.user_email,
          this.profile.room_type,
          this.chat_topic_space,
          this.profile.remove_date,
          this.messages_limit,
          this.messages_offset
        );
      } else {
        res = await get_messages(
          this.profile.room,
          this.profile.user_email,
          this.profile.room_type,
          null,
          this.profile.remove_date,
          this.messages_limit,
          this.messages_offset
        );
      }
      await this.update_messages_list(res.results);
      this.render();
    } catch (error) {
      console.log(error);
    }
  }

  async update_messages_list(messages_list) {
    await this.make_messages_html(messages_list);
    this.$chat_space_container.html(this.message_html);
  }

  async create_empty_space() {
    try {
      this.$chat_space_container = $(document.createElement("div")).addClass(
        "chat-space-container chat-space-center"
      );
      this.$chat_space.append(this.$chat_space_container);
      const no_messages_info = `<div class="no-messages-info">No messages are available. Once you send message they will appear here.</div>`;
      this.$chat_space_container.append(no_messages_info);

      const scroll_arrow = `
    <div class='arrow-button'>
    <button class='arrow'>
      <span data-icon="down" class="btn-ar">
        <svg viewBox="0 0 19 20" height="20" width="19" preserveAspectRatio="xMidYMid meet" class="" version="1.1" x="0px" y="0px"><path fill="currentColor" d="M3.8,6.7l5.7,5.7l5.7-5.7l1.6,1.6l-7.3,7.2L2.2,8.3L3.8,6.7z"></path></svg>
      </span>
    </button>
    </div>`;

      this.$chat_space_container.append(scroll_arrow);
      await this.setup_actions();
      this.render();
      this.setup_socketio();
    } catch (error) {
      console.log(error);
    }
  }

  async request_for_access_topic() {
    try {
      this.$chat_space_container = $(document.createElement("div")).addClass(
        "chat-space-container request-access-container"
      );
      this.$chat_space.append(this.$chat_space_container);
      const no_messages_info = `<div class="no-messages-info">You are not authorized to access this conversation.</div><div class="btn btn-primary mt-3 topic-request-access">Request Access</div>`;
      this.$chat_space_container.append(no_messages_info);
      this.render();
      this.not_authorized_user = true;
    } catch (error) {
      console.log(error);
    }
  }

  async get_chat_members() {
    if (!this.profile.room) {
      this.chat_members = [];
    } else {
      if (this.profile.parent_channel) {
        this.chat_members = await get_chat_members(this.profile.parent_channel);
      } else {
        this.chat_members = await get_chat_members(this.profile.room);
      }
    }
  }

  async get_topic_info() {
    if (!this.profile.room) {
      return;
    }
    let topic_info = await get_topic_info(
      this.profile.room_type == "Contributor"
        ? this.profile.parent_channel
        : this.profile.room
    );
    this.chat_topic = topic_info[0].chat_topic;
    this.chat_topic_subject = topic_info[0].chat_topic_subject;
    this.chat_topic_status = topic_info[0].chat_topic_status;
    this.reference_doctypes = topic_info[0].reference_doctypes;
    if (this.chat_topic) {
      this.render_mentioned_doctype_section(this.chat_topic_subject);
    }
  }

  setup_socketio() {
    const me = this;
    frappe.realtime.on("update_last_active", function (res) {
      if (
        res.sender_email == me.profile.contact &&
        me.profile.room_type == "Direct"
      ) {
        me.set_online();
      }
    });

    // frappe.realtime.on("trigger_channel_status", function (res) {
    //     // if (res.status == "Open") {
    //       me.profile.is_removed = 0;
    //       me.chat_status = 'Open';

    //       // 2) Remove the “closed” UI you injected
    //       me.$chat_actions.remove();
    //       me.$chat_space.find('.no-messages-info').remove();


    //       // 4) Reload the last N messages and scroll to bottom
    //       me.messages_offset = 0;
    //       me.messages_limit = 10;
    //       me.fetch_and_setup_messages();
        // }

        // else {
        //   // me.chat_space.chat_status = "Closed";
        //   me.chat_status = "Closed";

        //   $(".close-chat-window").click();

        //   const $btn = me.chat_info.$chat_info.find(".close-channel");
        //   if (me.chat_status === "Closed") {
        //     $btn.prop("disabled", true).text("Closed");
        //   } else {
        //     $btn.prop("disabled", false).text("Close Channel");
        //   }
        // }
    // });


    if (!this.profile.room) return;

    const target_channel =
      me.profile.room_type === "Contributor" && me.last_active_sub_channel
        ? me.last_active_sub_channel
        : me.profile.room;
    this.set_channel_realtime(target_channel);
  }

  async setup_actions() {
    if (
      (this.profile.room_type == "Contributor" &&
        this.last_active_sub_channel == "") ||
      this.profile.room_type == "Topic"
    ) {
      return;
    }

    if (this.profile.room_type == "Group" || this.chat_status == "Closed") {
      
      if (this.chat_status == "Closed") {
        this.$chat_actions = $(document.createElement("div"))
          .addClass("chat-space-actions text-center")
          .css({
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "40px",
          });

        

        // Add Reopen button
        const $reopenBtn = $(
          `<button class="btn btn-primary cc-reopen-btn">Reopen</button>`
        ).css({ marginRight: "10px" });

        // Add Create New button
        const $createNewBtn = $(
          `<button class="btn btn-secondary cc-create-new-btn">Create New</button>`
        );

        // Append buttons inside a wrapper
        const $btnWrapper = $("<div>").css({
          display: "flex",
          justifyContent: "center",
          gap: "10px",
        });

        if (this.profile.is_removed != 1) {
          // Add info message
          this.$chat_actions.append(
            `<div style="margin-bottom: 10px;">This is a closed channel. To start chatting, create a new one or reopen this one.</div>`
          );
          $btnWrapper.append($reopenBtn);
          if (this.profile.room_type != "Group") {
            $btnWrapper.append($createNewBtn);
          }
          this.$chat_actions.append($btnWrapper);
          this.$chat_space.append(this.$chat_actions);
        }
        return;
      }
    }
        



      if (this.profile.is_removed == 1) {
        this.$chat_actions = $(document.createElement("div")).addClass(
          "chat-space-actions text-center"
        );
        this.$chat_actions.append(
          `You can't send messages to this group because you're no longer a participant.`
        );
        this.$chat_space.append(this.$chat_actions);
        this.setup_events();
        return;
      }

    this.$chat_actions = $(document.createElement("div")).addClass(
      "chat-space-actions"
    );
    this.type_message_input = new TypeMessageInput({ chat_space: this });
    this.voice_clip = new VoiceClip({ chat_space: this });

    const file_attachment = `
      <div class="cc-attach-wrap">
        <span class='open-attach-items' title='More actions'>
          <span class="open-attach-plus">+</span>
        </span>
        <div class="cc-attach-menu">
          <button type="button" class="cc-attach-action" data-action="voice">
            <i class="fa fa-microphone"></i>
            <span>Send a voice clip</span>
          </button>
          <button type="button" class="cc-attach-action" data-action="file">
            <i class="fa fa-paperclip"></i>
            <span>Attach a file up to 100 MB</span>
          </button>
        </div>
      </div>
      <input type='file' id='chat-file-uploader' style='display: none;'>`;    const chat_actions_html = `
      <div class="cc-reply-preview-container">
        <div class="cc-reply-preview-content">
          <div class="cc-reply-user"></div>
          <div class="cc-reply-text"></div>
        </div>
        <div class="cc-reply-close"><i class="fa fa-times"></i></div>
      </div>
      <div class="message-section">
          ${this.profile.room_type != "Guest" ? file_attachment : ``}
          <div class="cc-composer-shell">
            <div class="cc-composer-main">
              <div class="cc-input-pill">
                ${this.type_message_input.wrapper}
                <span class='cc-ep-trigger' title='Emoji'>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="#0084ff"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-3.5-9c.828 0 1.5-.672 1.5-1.5S9.328 8 8.5 8 7 8.672 7 9.5s.672 1.5 1.5 1.5zm7 0c.828 0 1.5-.672 1.5-1.5S16.328 8 15.5 8 14 8.672 14 9.5s.672 1.5 1.5 1.5zm-3.5 6.5c2.33 0 4.314-1.548 4.903-3.67.114-.41-.128-.83-.538-.943-.41-.114-.83.128-.943.538-.415 1.503-1.802 2.575-3.422 2.575s-3.007-1.072-3.422-2.575c-.114-.41-.533-.652-.943-.538-.41.114-.652.533-.538.943.589 2.122 2.573 3.67 4.903 3.67z"></path></svg>
                </span>
              </div>
              <span class='message-send-button' style="display:none">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#0084ff"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
              </span>
            </div>
          </div>
      </div>
      <div class="voice-section">
      </div>
      `;
    this.$chat_actions.html(chat_actions_html);

    if (this.profile.room_type != "Guest") {
      this.$chat_actions
        .find(".voice-section")
        .append(this.voice_clip.$voice_message);
    }

    this.$chat_space.append(this.$chat_actions);

    this.add_tag_section(this.contributors);
  }

  setup_events() {
    const me = this;

    const scroll_to_message = function (message_name) {
      const $target_msg = me.$chat_space.find(
        `.cc-message-wrapper[data-message-name="${message_name}"]`
      );
      if (!$target_msg.length) return;

      me.$chat_space_container.animate(
        {
          scrollTop:
            me.$chat_space_container.scrollTop() +
            $target_msg.position().top -
            100,
        },
        500
      );

      $target_msg.find(".message-bubble").addClass("cc-flash-highlight");
      setTimeout(() => {
        $target_msg.find(".message-bubble").removeClass("cc-flash-highlight");
      }, 2000);
    };

    // --- REPLY EVENTS ---
    this.$chat_space.on("click", ".cc-reply-trigger", function(e) {
      const $wrapper = $(this).closest(".cc-message-wrapper");
      const message_name = $wrapper.data("message-name");
      const sender_name = $wrapper.hasClass("sender-message")
        ? "You"
        : $wrapper.find(".message-name").text() && $wrapper.find(".message-name").text() !== "User"
          ? $wrapper.find(".message-name").text()
          : me.profile.room_name || "User";
      const $bubble_clone = $wrapper.find(".message-bubble").clone();
      $bubble_clone.find(".cc-replied-message, .cc-inline-reply-quote, .message-name, .message-time, .cc-reaction-bar").remove();
      
      // Replace emoji images with their text characters so .text() can see them
      $bubble_clone.find("img.cc-twemoji").each(function() {
        $(this).replaceWith($(this).attr("alt"));
      });
      
      const content = $bubble_clone.text().replace(/\s+/g, " ").trim();

      me.reply_to_message = {
        message_name: message_name,
        sender_name: sender_name,
        content: content
      };

      const $preview = me.$chat_actions.find(".cc-reply-preview-container");
      $preview.find(".cc-reply-user").text(`Replying to ${sender_name}`);
      $preview.find(".cc-reply-text").html(parseMessageTwemoji(content));
      $preview.addClass("visible");

      // Focus the input
      me.$chat_actions.find(".type-message").focus();
    });

    this.$chat_space.on(
      "click",
      ".cc-replied-message, .cc-inline-reply-quote",
      function (e) {
        const target = $(this).data("target");
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        scroll_to_message(target);
      }
    );

    this.$chat_space.on("click", ".cc-reply-close", function() {
      me.reply_to_message = null;
      me.$chat_actions.find(".cc-reply-preview-container").removeClass("visible");
    });

    this.$chat_space.on("click", ".cc-reply-preview-container", function(e) {
      if ($(e.target).closest(".cc-reply-close").length) return;
      if (!me.reply_to_message || !me.reply_to_message.message_name) return;
      scroll_to_message(me.reply_to_message.message_name);
    });


    // --- REOPEN & CREATE NEW (DELEGATED) ---
    this.$chat_space.on("click", ".cc-reopen-btn", (e) => {
      e.preventDefault();
      const room = me.profile.room;
      frappe.call({
        method: "clefincode_chat.api.api_1_2_1.api.trigger_chat_channel_status",
        args: { room: room, is_open: false },
        callback: async (r) => {
          if (!r.exc) {
            me.profile.is_removed = 0;
            me.chat_status = "Open";
            me.$chat_actions.remove();
            me.$chat_space.find(".no-messages-info").remove();
            me.prevMessage = {};
            me.messages_offset = 0;
            await me.setup_actions();
            await me.fetch_and_setup_messages();
            me.render();
          }
        },
      });
    });

    this.$chat_space.on("click", ".cc-create-new-btn", (e) => {
      e.preventDefault();
      const contact = me.profile.contact;
      const contact_name = me.profile.room_name;
      const platform = me.profile.platform;
      me.open_chat_space(contact, contact_name, platform);
    });

    // --- REACTION EVENTS (DELEGATED) ---
    // 1. Quick reaction click
    this.$chat_space.on("click", ".cc-quick-react", function(e) {
      const emoji = $(this).data("emoji");
      const message_name = $(this).closest(".cc-message-wrapper").data("message-name");
      const room = me.profile.room_type === "Contributor" ? me.profile.parent_channel : me.profile.room;

      frappe.call({
        method: "clefincode_chat.api.api_1_2_1.api.toggle_message_reaction",
        args: { message_name, emoji, user_email: me.profile.user_email, room }
      }).then((r) => {
        const reactions = r && r.message && r.message.results && r.message.results[0] && r.message.results[0].reactions;
        if (reactions) me.update_message_reactions(message_name, reactions);
      });
    });

    // 2. Open full picker for reactions
    this.$chat_space.on("click", ".open-full-emoji-picker", function(e) {
      const message_name = $(this).closest(".cc-message-wrapper").data("message-name");
      new EmojiPicker({
        anchor: $(this),
        mode: "reaction",
        chat_space: me,
        message_name: message_name
      });
    });

    // --- Global Reaction Palette Setup (Messenger style: float on top of everything) ---
    this.render_global_palette = () => {
      const reactions = JSON.parse(localStorage.getItem("cc_quick_reactions") || '["👍","❤️","😂","😮","😢","😡"]');
      let html = `
        <div class="cc-global-reaction-palette">
          <div class="cc-message-actions">
            ${reactions.map(emoji => `<span class="cc-quick-react" data-emoji="${emoji}">${renderEmoji(emoji)}</span>`).join("")}
            <button class="cc-ep-trigger open-full-emoji-picker" title="More emojis"><i class="fa fa-plus"></i></button>
          </div>
        </div>`;
      
      if ($("body > .cc-global-reaction-palette").length) {
        $("body > .cc-global-reaction-palette").replaceWith($(html).appendTo("body"));
      } else {
        $(html).appendTo("body");
      }
      this.$global_palette = $("body > .cc-global-reaction-palette");
    };

    if (!$("body > .cc-global-reaction-palette").length) {
      this.render_global_palette();

      // Hide when clicking outside
      $(document).on("mousedown.cc_palette", (e) => {
        if (!$(e.target).closest(".cc-reaction-trigger, .cc-global-reaction-palette, .cc-customize-dialog, .cc-emoji-picker").length) {
          $(".cc-global-reaction-palette").removeClass("active");
        }
      });
    } else {
      this.$global_palette = $("body > .cc-global-reaction-palette");
    }

    // --- Scroll to Bottom Button Setup ---
    if (!this.$chat_space.find(".cc-scroll-bottom").length) {
      this.$scroll_bottom = $(`
        <div class="cc-scroll-bottom" title="Scroll to latest message">
          <span class="cc-sb-arrow">↓</span>
        </div>
      `).appendTo(this.$chat_space);

      this.$scroll_bottom.on("click", function() {
        const container = me.$chat_space_container[0];
        if (container) {
          me.$chat_space_container.animate({
            scrollTop: container.scrollHeight
          }, 400);
        }
      });
    }

    // Capture all scroll events in the chat space
    const updateScrollBtn = () => {
      const container = me.$chat_space_container ? me.$chat_space_container[0] : null;
      if (!container) return;
      
      const isAtBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 100;
      const $btn = me.$chat_space.find(".cc-scroll-bottom");
      
      if (isAtBottom) {
        $btn.removeClass("visible");
      } else {
        $btn.addClass("visible");
      }
    };

    // Use capturing listener to catch scroll even if container is replaced
    window.addEventListener("scroll", (e) => {
      if (e.target.classList && e.target.classList.contains("chat-space-container")) {
        updateScrollBtn();
        
        // Hide reaction palette and emoji picker on scroll to prevent detached popups
        $("body > .cc-global-reaction-palette").removeClass("active");
        $(".cc-emoji-picker").removeClass("cc-ep-open");
        setTimeout(() => $(".cc-emoji-picker").remove(), 200);
      }
    }, true);

    // Also check on image loads (common cause of height shifts)
    this.$chat_space.on("load", "img", updateScrollBtn);

    // Scroll to latest message click handler
    this.$chat_space.on("click", ".cc-scroll-bottom", function() {
      if (me.$chat_space_container && me.$chat_space_container.length) {
        me.$chat_space_container.animate({
          scrollTop: me.$chat_space_container[0].scrollHeight
        }, 400); // Smooth scroll to bottom
      }
    });

    // (Removed broken delegated scroll listener as scroll events don't bubble)

    // 3. Click reaction trigger to show global palette
    this.$chat_space.on("click", ".cc-reaction-trigger", function(e) {
      e.stopPropagation();
      const $btn = $(this);
      const $palette = $("body > .cc-global-reaction-palette");
      
      console.group("ClefinCode Reaction Trace: [Trigger Click]");
      
      // Try to get message name with multiple fallbacks
      let message_name = $btn.data("message") || $btn.attr("data-message");
      if (!message_name || message_name === "undefined") {
        const $wrapper = $btn.closest(".cc-message-wrapper");
        message_name = $wrapper.data("message-name") || $wrapper.attr("data-message-name");
        console.log("- Fallback to wrapper ID:", message_name);
      }

      console.log("- Captured Message ID:", message_name);

      if (!message_name || message_name === "undefined") {
        console.error("- [FAILED] Trigger clicked but no valid message name found.");
        console.groupEnd();
        return;
      }

      const $wrapper = $btn.closest(".cc-message-wrapper");
      
      // Position the palette relative to the document (Absolute body positioning)
      $palette.addClass("active"); 
      const palette_width = $palette.outerWidth() || 320;
      const $bubble = $btn.closest(".cc-message-wrapper").find(".message-bubble").first();
      
      if (!$bubble.length) {
        console.error("- [FAILED] Bubble not found for palette positioning.");
        return;
      }

      // Explicit document-relative coordinates using TRIGGER BUTTON (the smiley) as anchor
      const btn_rect = $btn[0].getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Position it exactly above the button
      let top = btn_rect.top + scrollTop - 55; // 55px above the button top
      let left = (btn_rect.left + btn_rect.right) / 2 + scrollLeft - (palette_width / 2);

      // Clamp horizontally within window boundaries
      const win_width = $(window).width();
      if (left < 10) left = 10;
      if (left + palette_width > win_width - 10) left = win_width - palette_width - 10;

      console.warn("- Reaction Palette Anchor Check (Button Mode):", { top, left, btn_rect, scrollTop });

      $palette.css({
        position: "absolute",
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 200000 
      }).attr("data-active-message", message_name)
        .data("trigger-btn", $btn); // Store the original smiley button
      
      console.log("- Palette activated for ID:", message_name);
      console.groupEnd();
    });

    // 4. Click reaction badge to toggle
    this.$chat_space.on("click", ".cc-reaction-badge", function(e) {
      const emoji = $(this).data("emoji");
      const $bar = $(this).closest(".cc-reaction-bar");
      const message_name = $bar.data("message") || $bar.attr("data-message");
      
      console.group("ClefinCode Reaction Trace: [Badge Toggle]");
      console.log("- Emoji:", emoji);
      console.log("- Message ID:", message_name);

      const room = me.profile.room_type === "Contributor" ? me.profile.parent_channel : me.profile.room;

      if (!message_name || message_name === "undefined" || !emoji) {
        console.error("- [ABORTED] Missing ID or Emoji.");
        console.groupEnd();
        return;
      }

      frappe.call({
        method: "clefincode_chat.api.api_1_2_1.api.toggle_message_reaction",
        args: { message_name, emoji, user_email: me.profile.user_email, room }
      }).then((r) => {
        const reactions = r && r.message && r.message.results && r.message.results[0] && r.message.results[0].reactions;
        if (reactions) me.update_message_reactions(message_name, reactions);
      });
      console.groupEnd();
    });

    // 5. Global Palette Selection (Quick Reacts)
    $(document).off("click.cc_react").on("click.cc_react", ".cc-global-reaction-palette .cc-quick-react", function(e) {
      e.stopPropagation();
      const $palette = $("body > .cc-global-reaction-palette");
      if (!$palette.hasClass("active")) return;

      const emoji = $(this).data("emoji") || $(this).attr("data-emoji");
      const message_name = $palette.attr("data-active-message");
      
      console.group("ClefinCode Reaction Trace: [Quick Palette Selection]");
      if (emoji && message_name && message_name !== "undefined") {
        const room = me.profile.room_type === "Contributor" ? me.profile.parent_channel : me.profile.room;
        frappe.call({
          method: "clefincode_chat.api.api_1_2_1.api.toggle_message_reaction",
          args: { message_name, emoji, user_email: me.profile.user_email, room }
        }).then((r) => {
          const reactions = r && r.message && r.message.results && r.message.results[0] && r.message.results[0].reactions;
          if (reactions) me.update_message_reactions(message_name, reactions);
        });
      }
      $palette.removeClass("active");
      console.groupEnd();
    });

    // 5b. Global Palette Selection (More Emojis)
    $(document).off("click.cc_more").on("click.cc_more", ".cc-global-reaction-palette .open-full-emoji-picker", function(e) {
      e.stopPropagation();
      const $palette = $("body > .cc-global-reaction-palette");
      const message_name = $palette.attr("data-active-message");
      const $original_btn = $palette.data("trigger-btn"); // Get original smiley button
      
      if (!message_name || message_name === "undefined") return;

      // Hide the quick palette first
      $palette.removeClass("active");

      new EmojiPicker({
        anchor: $original_btn || $(this),
        mode: "reaction",
        message_name: message_name,
        chat_space: me,
        on_select: (emoji) => {
          $palette.removeClass("active");
          me.$chat_space_container.css("overflow", "");
        },
        on_customize_save: () => {
          me.render_global_palette();
        }
      });
    });

    $(document).on("click.cc_reaction_close", function(e) {
      const $palette = me.$chat_space ? me.$chat_space.find(".cc-global-reaction-palette") : null;
      if ($palette && $palette.hasClass("active")) {
        if (!$(e.target).closest(".cc-global-reaction-palette").length && !$(e.target).closest(".cc-reaction-trigger").length) {
          $palette.removeClass("active");
          me.$chat_space_container.css("overflow", "");
        }
      }
    });

    this.$chat_space.find(".cc-ep-trigger").on("click", function () {
      new EmojiPicker({
        anchor: $(this),
        mode: "input",
        chat_space: me,
        on_select: (emoji) => {
          me.type_message_input.insert_emoji(emoji);
        }
      });
    });

    this.$chat_space
      .find(".topic-request-access")
      .on("click", async function () {
        await send_topic_access_request(
          me.profile.user_email,
          me.chat_topic_space,
          me.chat_topic_channel,
          me.chat_topic_space_subject,
          cur_frm.doc.doctype,
          cur_frm.doc.name
        );
        me.$chat_space_container.html(
          `<div class="alert alert-secondary no-messages-info">Your request has been sent</div>`
        );
      });

    this.$chat_space.find(".close-chat-window").on("click", function () {
      if (me.voice_clip && me.voice_clip.stream) {
        const tracks = me.voice_clip.stream.getTracks();
        tracks.forEach((track) => {
          track.stop();
        });
      }
      if (me.audiodict !== "undefined" && me.audiodict !== undefined) {
        for (let audio in me.audiodict) {
          if (me.audiodict.hasOwnProperty(audio)) {
            if (!me.audiodict[audio].paused) me.audiodict[audio].pause();
          }
        }
      }
      me.audiodict = [];

      me.is_open = 0;
      frappe.realtime.off(me.profile.room);
      frappe.realtime.off(me.last_active_sub_channel);
      frappe.realtime.off("update_last_active");
      if (me.profile.room_type == "Contributor") {
        frappe.ErpnextChat.settings.open_chat_space_rooms =
          frappe.ErpnextChat.settings.open_chat_space_rooms.filter(
            (item) => item != me.profile.parent_channel
          );
      } else {
        frappe.ErpnextChat.settings.open_chat_space_rooms =
          frappe.ErpnextChat.settings.open_chat_space_rooms.filter(
            (item) => item != me.profile.room
          );
      }

      $(this).closest(".chat-window").remove();           
    });

    this.$chat_space.find(".avatar").on("click", function () {
      $(this).closest(".chat-space").find(".chat-profile-info").click();
    });

    this.$chat_space.find(".chat-profile-info").on("click", function () {
      if (me.not_authorized_user) {
        return;
      }
      me.$chat_space.find(".mentioned-doctype-section").remove();
      me.chat_info = new ChatInfo({
        chat_space: me,
        chat_status: this.chat_status
      });
      me.$chat_space.find(".arrow-button").css("z-index", "0");
    });

    this.$chat_space.find(".collapse-chat-window").on("click", function () {
      me.is_open = 0;
      if (me.profile.room_type == "Contributor") {
        frappe.ErpnextChat.settings.open_chat_space_rooms =
          frappe.ErpnextChat.settings.open_chat_space_rooms.filter(
            (item) => item != me.profile.parent_channel
          );
      } else {
        frappe.ErpnextChat.settings.open_chat_space_rooms =
          frappe.ErpnextChat.settings.open_chat_space_rooms.filter(
            (item) => item != me.profile.room
          );
      }

      var id0 = $(this).closest(".chat-window").attr("data-room");
      var id1 = $(this).closest(".chat-window").attr("data-contact");
      var id2 = $(this).closest(".chat-window").attr("data-topic");
      var attr;
      var id;
      if (typeof id0 == "undefined" && typeof id1 == "undefined") {
        id = id2;
        attr = "data-topic";
      } else if (typeof id0 == "undefined" && typeof id2 == "undefined") {
        id = id1;
        attr = "data-contact";
      } else {
        id = id0;
        attr = "data-room";
      }
      var tit = $(this)
        .closest(".chat-window")
        .find(".chat-profile-name")
        .text();
      var chat_bottom = $(".chat_bottom");
      chat_bottom.append(`
    <div  data-id="${id}" class="minimized-chat" style="min-width:190px; display:flex;">
      <span class="test"></span>
      <span class='expand-chat-window' style="margin-right:auto;display:block;cursor: pointer;width: 100%;  white-space: nowrap;overflow: hidden;text-overflow: ellipsis;" onclick="expand_me('${id}','${attr}','${me.profile.room_type}','${me.profile.room}','${me.profile.parent_channel}','${me.chat_topic_space}')">${tit} </span>
      <span data-id="${id}"  class='expand-chat-window' style="cursor: pointer;" onclick="expand_me('${id}','${attr}','${me.profile.room_type}','${me.profile.room}','${me.profile.parent_channel}','${me.chat_topic_space}'); " >${frappe.utils.icon("expand", "md")}</span>
      <span  class='close-small-chat-window' style="cursor: pointer;"  onclick="closeMe('${id}','${attr}'); ">${frappe.utils.icon("close", "lg")}</span>
    </div>

    `);

      $(this).closest(".chat-window").css("display", "none");
    });

    this.$chat_space.find(".arrow").on("click", function () {
      $(this)
        .closest(".chat-space-container")
        .animate(
          { scrollTop: me.$chat_space_container.prop("scrollHeight") },
          "fast"
        );
      $(this).css("display", "none");
    });

    me.$chat_space_container.on("scroll", function () {
      me.on_scroll();
    });

    if (this.$chat_actions && this.$chat_actions.length > 0) {
      this.$chat_actions.find(".open-attach-items").on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        me.$chat_actions.find(".cc-attach-menu").toggleClass("visible");
      });

      this.$chat_actions.find(".cc-attach-menu").on("click", function (e) {
        e.stopPropagation();
      });

      this.$chat_space.off("click.cc_attach_menu").on("click.cc_attach_menu", function () {
        me.$chat_actions.find(".cc-attach-menu").removeClass("visible");
      });

      this.$chat_actions.find(".cc-attach-action[data-action='voice']").on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        me.$chat_actions.find(".cc-attach-menu").removeClass("visible");
        if (me.voice_clip && me.voice_clip.$voice_clip) {
          me.voice_clip.$voice_clip.trigger("click");
        }
      });

      this.$chat_actions.find(".cc-attach-action[data-action='file']").on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        me.$chat_actions.find(".cc-attach-menu").removeClass("visible");
        me.$chat_actions.find("#chat-file-uploader").click();
      });

      this.$chat_actions.find('#chat-file-uploader').on('change', function () {
        if (this.files.length > 0) {
          me.file = {};
          me.file.file_obj = this.files[0];
          me.handle_upload_file(me.file);
          me.file = null;
        }
      });

      this.$chat_actions.find(".message-send-button").on("click", function () {
        if (me.press_enter === 1) {
          return;
        }
        me.press_enter = 1;

        me.handle_send_message()
          .then(() => {
            me.press_enter = 0;
          })
          .catch((error) => {
            console.error("An error occurred:", error);
            me.press_enter = 0;
          });
      });

      this.$chat_actions.find(".type-message").on("input", function () {
        if (me.type_message_input) {
          me.type_message_input.sync_height();
        }
        if (me.profile.room) {
          // Only call setupTypingIndicator if it's not already active
          if (!me.isTypingIndicatorActive) {
            const textValue = $(this).val();

            if (!me.isTypingIndicatorActive) {
              if (textValue.startsWith("/") && textValue.length === 1) {
                me.setupTypingIndicator(textValue);
              } else {
                me.setupTypingIndicator();
                const container = document.querySelector("#template-suggestions");
                if (container) container.remove();
              }
              me.isTypingIndicatorActive = true;
            }
            else {
              const container = document.querySelector("#template-suggestions");
              if (container) container.remove();
            }
          }
        }

        me.toggle_voice_clip_icon();

        const text = $(this).val();
        if (contains_arabic(text)) {
          $(this).css({
            direction: "rtl",
            "text-align": "right",
          });
        } else {
          $(this).css({
            direction: "ltr",
            "text-align": "left",
          });
        }
      });

      this.$chat_actions.find(".cc-input-pill").on("click", function () {
        me.type_message_input.quill.focus();
      });

      this.$chat_actions.find(".type-message").on("keydown", function (e) {
        me.toggle_voice_clip_icon();

        if (!me.type_message_input) return;

        if (e.which === 13) {
          // Since mentions are removed for now, we don't need is_mention_open check
          
          if (!e.shiftKey) {
            e.preventDefault(); 
            if (me.press_enter === 1) {
              return;
            }
            me.press_enter = 1;

            me.handle_send_message()
              .then(() => {
                me.press_enter = 0;
              })
              .catch((error) => {
                console.error("An error occurred:", error);
                me.press_enter = 0;
              });
          }
        }
      });
    }

    this.$chat_space_container.find("span.mention").on("click", function () {
      if (
        $(this).data("id") == me.profile.user_email ||
        $(this).data("is-doctype") == 1
      ) {
        return;
      }
      me.check_if_contact_has_chat(
        me.profile.user_email,
        $(this).data("id"),
        $(this).data("name"),
        "Chat"
      );
    });

    me.setup_voice_clip_event();
  } //End setup_events

  async handle_upload_file(file) {
    const max_upload_size = 100 * 1024 * 1024;
    if (file.file_obj && file.file_obj.size > max_upload_size) {
      frappe.msgprint(__("Please choose a file up to 100 MB."));
      return;
    }
    const dataurl = await frappe.dom.file_to_base64(file.file_obj);
    file.dataurl = dataurl;
    file.name = file.file_obj.name;
    return this.upload_file(file);
  }

  upload_file(file) {
    const me = this;

    return new Promise((resolve, reject) => {
      show_overlay("Uploading...");

      const form_data = new FormData();
      form_data.append('file', file.file_obj, file.name);

      fetch('/api/method/clefincode_chat.api.api_1_3_1.api.upload_chat_file', {
        method: 'POST',
        headers: {
          'X-Frappe-CSRF-Token': frappe.csrf_token,
          'Accept': 'application/json',
        },
        body: form_data,
      })
        .then((res) => res.json())
        .then((r) => {
          const file_doc = r && r.message;
          if (!file_doc || !file_doc.file_url) {
            hide_overlay();
            reject(new Error(__('File upload failed!')));
            frappe.msgprint(__('File upload failed!'));
            return;
          }
          resolve();
          me.handle_send_message(file_doc.file_url, file_doc.file_name, file_doc.name)
            .catch((err) => { hide_overlay(); console.error("File send error:", err); });
        })
        .catch((err) => {
          hide_overlay();
          console.error("Upload error:", err);
          frappe.msgprint(__('File upload failed. Please try again.'));
          reject(err);
        });
    });
  }

  setup_voice_clip_event() {
    let me = this;
    me.$chat_space.on("click", ".message-bubble .audio-btn", function () {
      const audioUrl = "/private/files/";
      if (me.audiodict === undefined || me.audiodict === "undefined")
        me.audiodict = [];

      const $voiceClipContainer = $(this).closest(".voice-clip-container");
      const filename = $voiceClipContainer.data("audio");
      if (!this.audio) {
        // The src attribute should be set to the audio file URL
        if (filename in me.audiodict) {
          this.audio = me.audiodict[filename];
        } else {
          this.audio = new Audio();

          this.audio.src = audioUrl + filename;
          me.audiodict[filename] = this.audio;
        }
        let duration = $voiceClipContainer.data("duration");

        // When the audio can play through, play it and update the progress bar
        this.audio.addEventListener("canplaythrough", () => {
          this.audio.play();
          $(this).find('[data-icon="audio-play"]').hide();
          $(this).find(".stop-btn").show();
        });

        // Update the progress bar as the audio plays
        this.audio.addEventListener("timeupdate", () => {
          let percentage = (this.audio.currentTime / duration) * 100;
          let remainingTime = duration - this.audio.currentTime;

          // Set the width immediately without transition
          $voiceClipContainer
            .find(".record-sec")
            .css("--progress-width", `${percentage}%`);

          // Now set a transition to match the remaining time of the audio
          $voiceClipContainer
            .find(".record-sec")
            .css("transition", `width ${remainingTime}s linear`);
        });

        // When the audio ends, reset the progress bar
        this.audio.addEventListener("ended", () => {
          $voiceClipContainer.find(".record-sec").css("--progress-width", "0%");
          $voiceClipContainer.find(".record-sec").css("transition", "none");
          $(this).find(".stop-btn").hide();
          $(this).find('[data-icon="audio-play"]').show();
        });
      } else {
        // Toggle play/pause if the audio is already initialized
        if (this.audio.paused) {
          this.audio.play();
          $(this).find('[data-icon="audio-play"]').hide();
          $(this).find(".stop-btn").show();
        } else {
          this.audio.pause();
          $(this).find(".stop-btn").hide();
          $(this).find('[data-icon="audio-play"]').show();
        }
        if (!(filename in me.audiodict)) {
          me.audiodict[filename] = this.audio;
        }
      }
      for (let audio in me.audiodict) {
        if (me.audiodict[audio] != this.audio) {
          let $cont = $(".voice-clip-container[data-audio='" + audio + "']");
          if ($cont.length > 0) {
            $cont.find(".stop-btn").hide();
            $cont.find('[data-icon="audio-play"]').show();
          }
          me.audiodict[audio].pause();
        }
      }
    });

    me.$chat_space.on(
      "click",
      ".message-bubble .record-canvas",
      function (event) {
        const $voiceClipContainer = $(this).closest(".voice-clip-container");
        const filename = $voiceClipContainer.data("audio");
        const duration = $voiceClipContainer.data("duration");
        let audio = null;
        if (!me.audiodict[filename]) {
          const audioUrl = "/private/files/" + filename;
          audio = new Audio(audioUrl);
          me.audiodict[filename] = audio;
        } else {
          audio = me.audiodict[filename];
        }
        const rect = this.getBoundingClientRect();
        const x = event.clientX - rect.left; // x position within the element
        const totalWidth = $(this).width();
        const clickPositionRatio = x / totalWidth;

        const audioTime = clickPositionRatio * duration;

        audio.currentTime = audioTime; // Set the audio time

        // Update the progress bar
        const percentage = (audio.currentTime / duration) * 100;
        $voiceClipContainer
          .find(".record-sec")
          .css("--progress-width", `${percentage}%`);
      }
    );
  }

  async check_if_contact_has_chat(user_email, contact, contact_name, platform="test") {
    const me = this;
    const room = await check_if_contact_has_chat(user_email, contact, platform);
    if (room.results.name) {
      this.open_chat_space(contact, contact_name, platform, room.results.name);
    } else {
      this.open_chat_space(contact, contact_name, platform);
    }
  }

  open_chat_space(contact, contact_name, platform, room = null) {
    if (room) {
      if (check_if_chat_window_open(room, "room")) {
        $(".expand-chat-window[data-id|='" + room + "']").click();
        return;
      }

      this.chat_window = new ChatWindow({
        profile: {
          room: room,
        },
      });

      let profile = {
        is_admin: this.profile.is_admin,
        user: this.profile.user,
        user_email: this.profile.user_email,
        time_zone: this.profile.time_zone,
        room: room,
        room_name: contact_name,
        room_type: "Direct",
        contact: contact,
        is_first_message: 0,
        platform: platform,
      };
      this.chat_space = new ChatSpace({
        $wrapper: this.chat_window.$chat_window,
        profile: profile,
      });
    } else {
      if (check_if_chat_window_open(contact, "contact")) {
        $(".expand-chat-window[data-id|='" + contact + "']").click();
        return;
      }
      this.chat_window = new ChatWindow({
        profile: {
          contact: contact,
          platform: platform,
        },
      });

      let profile = {
        is_admin: this.profile.is_admin,
        user: this.profile.user,
        user_email: this.profile.user_email,
        time_zone: this.profile.time_zone,
        room: null,
        room_name: contact_name,
        room_type: "Direct",
        contact: contact,
        is_first_message: 1,
        platform: platform,
      };

      this.chat_space = new ChatSpace({
        $wrapper: this.chat_window.$chat_window,
        profile: profile,
      });
    }
  }

  toggle_voice_clip_icon() {
    const $input = this.$chat_actions.find(".type-message");
    const val = $input.val() ? $input.val().trim() : "";
    if (val !== "") {
      this.$chat_actions.find(".message-send-button").css("display", "flex");
    } else {
      this.$chat_actions.find(".message-send-button").css("display", "none");
    }
  }

  async setup_messages(messages_list) {
    if (this.$chat_space_container && this.$chat_space_container.length == 1) {
      this.$chat_space_container.remove();
    }
    this.$chat_space_container = $(document.createElement("div")).addClass(
      "chat-space-container"
    );
    await this.make_messages_html(messages_list);
    this.$chat_space_container.html(this.message_html);
    this.$chat_space.append(this.$chat_space_container);
    
    // Trigger initial check
    setTimeout(() => {
      const container = this.$chat_space_container[0];
      if (container) {
        const isAtBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 100;
        const $btn = this.$chat_space.find(".cc-scroll-bottom");
        if (isAtBottom) $btn.removeClass("visible");
        else $btn.addClass("visible");
      }
    }, 200);
  }

  async make_messages_html(messages_list, scroll = 0) {
    if (!this.prevMessage) {
      this.prevMessage = {};
    }
    this.message_html = "";
    for (const element of messages_list) {
      const date_line_html = this.make_date_line_html(
        element.send_date,
        scroll
      );
      this.prevMessage = element;
      this.message_html += date_line_html;

      let message_type = "recipient-message";

      if (element.sender_email === this.profile.user_email) {
        message_type = "sender-message";
      } else if (this.profile.room_type === "Guest") {
        if (this.profile.is_admin === true && element.sender !== "Guest") {
          message_type = "sender-message";
        }
      }
      if (element.message_type == "information") {
        message_type = "info-message";
      }

      const message_content = await this.make_message({
        content: element.content,
        time: get_time(
          element.send_date,
          this.profile.time_zone ? this.profile.time_zone : element.time_zone
        ),
        type: message_type,
        sender: element.sender,
        avatar: element.sender_image,
        sender_email: element.sender_email,
        message_name: element.message_name,
        reactions: element.reactions || [],
        message_template_type: element.message_template_type,
        get_messages: element.get_messages,
        reply_to: element.reply_to,
        replied_message_sender: element.replied_message_sender,
        replied_message_content: element.replied_message_content,
      });
      let attributeFound = false;
      let file_name = "";
      message_content.find("*").each(function () {
        if ($(this).attr("data-audio") !== undefined) {
          attributeFound = true;
          file_name = $(this).attr("data-audio");
          return false; // Breaks the loop once the attribute is found
        }
      });
      if (attributeFound) {
        let me = this;
        setTimeout(function () {
          let parent = $(
            ".message-bubble .voice-clip-container[data-audio='" +
              file_name +
              "']"
          );
          let element = parent.find("canvas").first();
          me.draw_clip_in_canvas("/private/files/" + file_name, element);
        }, 500);
      }
      this.message_html += message_content.prop("outerHTML");
    }
  }

  make_date_line_html(dateObj, scroll = 0) {
    let create_date_line = 0;
    let result = `
          <div class='date-line ${get_date_from_now(
            dateObj,
            "space",
            this.profile.time_zone
          )}'>
              <div class="for_line">
                <span class="left-line"></span>
                <span class="between-lines">
                  ${get_date_from_now(dateObj, "space", this.profile.time_zone)}
                </span>
                <span class="right-line"></span>
              </div>
          </div>
      `;
    const date_line = this.$chat_space_container.find(
      `.${get_date_from_now(dateObj, "space", this.profile.time_zone)}`
    );

    if (scroll == 1 && date_line && date_line.length == 1) {
      create_date_line = 1;
      date_line.remove();
    }
    if ($.isEmptyObject(this.prevMessage)) {
      return result;
    } else if (
      is_date_change(
        dateObj,
        this.prevMessage.send_date,
        this.profile.time_zone
      ) ||
      create_date_line == 1
    ) {
      return result;
    } else {
      return "";
    }
  }

  make_down_arrow_html() {
    return `
      <div class='arrow-button'>
      <button class='arrow'>
        <span data-icon="down" class="btn-ar">
          <svg viewBox="0 0 19 20" height="20" width="19" preserveAspectRatio="xMidYMid meet" class="" version="1.1" x="0px" y="0px"><path fill="currentColor" d="M3.8,6.7l5.7,5.7l5.7-5.7l1.6,1.6l-7.3,7.2L2.2,8.3L3.8,6.7z"></path></svg>
        </span>
      </button>
      </div> `;
  }

  async make_message(params) {
    const {
      content,
      time,
      type,
      sender,
      avatar,
      sender_email,
      message_name = "",
      message_template_type = null,
      get_messages = null,
      reply_to = null,
      replied_message_sender = null,
      replied_message_content = null,
    } = params;
    const $recipient_element = $(document.createElement("div"))
      .addClass(type)
      .addClass("cc-message-wrapper")
      .attr("data-message-name", message_name);

    const $message_element = $(document.createElement("div")).addClass(
      "message-bubble"
    );

    // Messenger-style hover reaction trigger (Global Palette approach)
    if (type !== "info-message") {
      const is_sender = type === "sender-message";
      const actions_html = is_sender 
        ? `<div class="cc-message-hover-actions">
            <button class="cc-reaction-trigger" data-message="${message_name}"><i class="fa fa-smile-o"></i></button>
          </div>`
        : `<div class="cc-message-hover-actions">
            <button class="cc-reaction-trigger" data-message="${message_name}"><i class="fa fa-smile-o"></i></button>
          </div>`;
      const $actions_bar = $(actions_html);
      $recipient_element.append($actions_bar);
    }

    const $name_element = $(document.createElement("div"))
      .addClass("message-name")
      .text(sender);

    let $sanitized_content = __($("<div>").html(parseMessageTwemoji(content)));
    const $message_content = $(document.createElement("div")).addClass("cc-message-content");
    
    if (type === "recipient-message") {
      const $avatar_container = $(document.createElement("div"))
        .addClass("cc-message-avatar")
        .attr("title", sender)
        .html(frappe.get_avatar("avatar-small", sender));
      
      $recipient_element.prepend($avatar_container);
    }

    const content_has_inline_reply =
      typeof content === "string" && content.indexOf("cc-inline-reply-quote") !== -1;

    // Handle Reply Structure (Messenger Style)
    let reply_header_html = "";
    let nested_reply_html = "";

    // Robust extraction: Check both parameters and inline HTML
    let r_user = replied_message_sender;
    let r_text = replied_message_content;
    let r_target = reply_to;

    // Check if content has the inline quote (even if parameters are missing)
    const $temp_content = $("<div>").html(params.content);
    const $quote = $temp_content.find(".cc-inline-reply-quote");
    
    if ($quote.length) {
      r_user = r_user || $quote.find(".cc-inline-reply-user").text();
      r_text = r_text || $quote.find(".cc-inline-reply-text").html();
      r_target = r_target || $quote.data("target");
      $quote.remove();
      params.content = $temp_content.html(); // Clean the content
    }

    if (r_user && (r_text || r_target)) {
      const is_me_replying = sender_email === this.profile.user_email;
      reply_header_html = `
        <div class="cc-reply-header ${is_me_replying ? 'is-me' : ''}">
          <i class="fa fa-reply"></i>
          <span>${is_me_replying ? 'You' : (params.sender || 'User')} replied to ${r_user === this.profile.user_email ? (is_me_replying ? 'yourself' : 'you') : r_user}</span>
        </div>
      `;

      nested_reply_html = `
        <div class="cc-nested-reply-quote" data-target="${r_target}">
          <div class="cc-nested-reply-text">${r_text || ""}</div>
        </div>
      `;
    }

    if (r_user && (r_text || r_target)) {
      $message_element.append(reply_header_html);
      $message_element.append(nested_reply_html);
      $message_element.addClass("has-reply");
    }

    const $main_text_container = $(document.createElement("div")).addClass("cc-bubble-main-text");
    $main_text_container.append(__($("<div>").html(parseMessageTwemoji(params.content))));
    $message_element.append($main_text_container);
    $message_content.append($message_element);
    $recipient_element.append($message_content);
    if (type == "info-message") {
      if (message_template_type == "Create Group") {
        // Handled above for Web structure
        $recipient_element.html(__($("<div>").html(parseMessageTwemoji(params.content))));
      }
    }

    // Add reaction bar container as a badge on the bubble
    if (type !== "info-message") {
      const $reaction_bar = $(`<div class="cc-reaction-bar" data-message="${message_name}"></div>`);
      this.render_reactions($reaction_bar, params.reactions || []);
      $message_element.append($reaction_bar);
    }

    const me = this;
    $message_element.find("span.mention").on("click", function () {
      if (
        $(this).data("id") == me.profile.user_email ||
        $(this).data("is-doctype") == 1
      ) {
        return;
      }
      me.check_if_contact_has_chat(
        me.profile.user_email,
        $(this).data("id"),
        $(this).data("name"),
        "Chat"
      );
    });

    if (type != "mention-message" && type != "info-message") {
      const $target = $recipient_element.find(".cc-message-content");
      if (!get_messages) {
        const send_date = await get_time_now(me.profile.user_email, 1);
        $target.append(
          `<div class='message-time'>${send_date}</div>`
        );
      } else {
        $target.append(`<div class='message-time'>${time}</div>`);
      }
    }
    return $recipient_element;
  }

  async handle_send_message(
    attachment = null,
    file_name = null,
    file_id = null
  ) {
    const reply_message = this.reply_to_message
      ? {
          reply_to: this.reply_to_message.message_name,
          replied_message_sender: this.reply_to_message.sender_name,
          replied_message_content: this.reply_to_message.content,
        }
      : {
          reply_to: null,
          replied_message_sender: null,
          replied_message_content: null,
        };
    this.$chat_space_container.removeClass("chat-space-center");
    this.$chat_space_container.find(".no-messages-info").remove();

    if (
      this.$chat_space_container.find(".ask-to-join") &&
      this.$chat_space_container.find(".ask-to-join").length > 0
    ) {
      this.$chat_space_container.find(".mention-message:last").remove();
    }

    const $input = this.$chat_actions.find(".type-message");
    let content = $input.val() ? $input.val().trim() : "";
    content = convert_emoticons_to_emojis(content);

    if (content.length === 0 && !attachment) {
      return;
    }

    // Convert newlines to <br> for HTML storage/rendering
    content = content.replace(/\n/g, "<br>");
    (this.is_link = null),
      (this.is_media = null),
      (this.is_document = null),
      (this.is_voice_clip = null);
    let chat_room;
    let is_screenshot = 0;
    // Image/Screenshot logic simplified for textarea
    if (false) { 
      is_screenshot = 1;
    }

    if(!this.profile.room && this.profile.is_website_support_group == 1){
      const results = await create_website_support_group(this.profile.user_email, content)
      this.profile.room = results.room;
      this.profile.respondent_user = results.respondent_user;
      this.setup_socketio();
    }

    if (!this.profile.room) {
      // Handle platform-specific gateway assignment
      switch (this.profile.platform) {
        case "WhatsApp":
          this.platform_gateway = this.default_whatsapp_number;
          break;
        case "Instagram":
          this.platform_gateway = this.default_instagram_profile;
          break;
        case "Messenger":
          this.platform_gateway = this.default_messenger_profile;
          break;
        case "Telegram":
          this.platform_gateway = this.default_telegram_profile;
          break;
      }
    
      // Special condition to create a group chat for WhatsApp/Instagram/Messenger/Telegram + Support
      const isSupportChannel =
        this.profile.platform === "WhatsApp" && this.default_whatsapp_type === "Support" ||
        this.profile.platform === "Instagram" && this.default_instagram_type === "Support" ||
        this.profile.platform === "Messenger" && this.default_messenger_type === "Support" ||
        this.profile.platform === "Telegram" && this.default_telegram_type === "Support";
    
      if (
        this.platform_gateway &&
        isSupportChannel
      ) {
        // Create a group chat instead of a direct one
        let selected_contacts_list = [{
          email: this.profile.contact,
          platform: this.profile.platform,
          platform_profile: this.platform_profile,
          platform_gateway: this.platform_gateway
        }];
    
        let results = await create_group(selected_contacts_list, this.profile.user_email);
        this.profile.room = results[0].room;
        this.set_channel_realtime(this.profile.room);
        this.$chat_space
          .closest(".chat-window")
          .attr("data-room", this.profile.room);
        frappe.ErpnextChat.settings.open_chat_space_rooms.push(this.profile.room);
        this.is_first_message = 0;
      } else {
        // For all other scenarios: create a direct channel
        await this.create_direct_channel(content);
      }
    }
    
    

    if(this.profile.new_member == 1){
      const new_member = [{"email" : this.profile.user_email , "platform" : "Chat"}]
      await add_group_member(
        new_member,
        this.profile.room
      );
      this.profile.new_member = 0

      const message_info = {
        content: `${this.profile.user} Joined`,
        user: this.profile.user,
        room: this.profile.room,
        email: this.profile.user_email   ,
        message_type : "information"
      };
      this.last_chat_space_message = await send_message(message_info);
    }

    if (attachment) {
      content = await this.handle_attachment(attachment, file_name);
    } else {
      content = this.check_if_content_has_email(content);
      content = this.check_if_content_has_link(content);
      if (contains_arabic(content)) {
        let $content = $(document.createElement("div")).append(content);
        $content.css({
          direction: "rtl",
          "text-align": "right",
        });
        content = $content.prop("outerHTML");
      }
    }

    if (this.profile.room_type == "Contributor") {
      chat_room = this.profile.parent_channel;
    } else {
      chat_room = this.profile.room;
    }

    if (reply_message.reply_to) {
      const reply_quote_html = `
        <div class="cc-inline-reply-quote" data-target="${reply_message.reply_to}">
          <div class="cc-inline-reply-user">${reply_message.replied_message_sender || ""}</div>
          <div class="cc-inline-reply-text">${reply_message.replied_message_content || ""}</div>
        </div>
      `;
      const content_html =
        content && typeof content === "object" && content.prop
          ? content.prop("outerHTML")
          : content || "";
      content = `${reply_quote_html}${content_html}`;
    }

    if (this.type_message_input) {
      this.type_message_input.clear();
    } else {
      this.$chat_actions.find(".type-message").val("");
    }
    this.voice_clip.$voice_clip.css("display", "none");
    this.$chat_actions.find(".message-send-button").css("display", "none");

    // ================= Handling with Mentions ===========================
    if (
      this.profile.user != "Guest" &&
      !attachment &&
      this.profile.room_type != "Contributor"
    ) {
      let results = this.extract_mentions(content);
      let mention_users = [];
      let mention_doctypes = [];

      if (results.contributors.length > 0) {
        mention_users = await this.check_mentioned_user(results.contributors);
      }
      if (results.mention_doctypes.length > 0) {
        mention_doctypes = await this.check_mention_doctypes(
          results.mention_doctypes
        );
      }

      if (mention_users.length > 0 && mention_doctypes.length > 0) {
        const me = this;
        const mentioned_users_emails =
          mention_users.length > 1
            ? mention_users.map((obj) => obj.email).join(", ")
            : mention_users[0].email;
        const mentioned_users_name =
          mention_users.length > 1
            ? mention_users.map((obj) => obj.name).join(", ")
            : mention_users[0].name;

        this.ask_to_join_template = `
      <div class="ask-to-join-container">
        <div class="alert alert-primary alert-dismissible btn fade show ask-to-join btn-primary" style="width:100%;text-align:left;" role="alert">
            ${frappe.utils.icon(
              "assign",
              "md"
            )} Ask <strong>${mentioned_users_name}</strong> to join
            <button id="close-ask-to-join" type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
        </div>          
        </div>
      <div>
      `;
        this.$chat_space_container.append(
          await this.make_message({
            content: this.ask_to_join_template,
            type: "mention-message",
            sender: this.profile.user,
          })
        );

        this.$chat_space_container
          .find(".ask-to-join")
          .on("click", function (e) {
            const old_sub_channel = me.last_active_sub_channel;
            $(this).alert("close");
            me.handle_mentions(
              mentioned_users_name,
              mentioned_users_emails,
              content,
              mention_users,
              chat_room,
              old_sub_channel
            );

            const tag_section_exists =
              me.$chat_space.find(".tag-section").length > 0;
            if (!tag_section_exists) {
              me.add_tag_section(me.contributors);
            } else {
              for (let i = 0; i < mention_users.length; i++) {
                this.tag_blot1 = new TagBlot({
                  $wrapper: me.$chat_space.find(".tags-container"),
                  profile: {
                    chat_space: me,
                    contributor_email: mention_users[i].email,
                    contributor_name: mention_users[i].name,
                  },
                });
                me.$chat_space.find(".tags-container").append(this.tag_blot1);
              }
            }
            return;
          });

        this.$chat_space_container
          .find("#close-ask-to-join")
          .on("click", function (e) {
            e.stopPropagation(); // Stops event from bubbling up to parent
            $(this).closest(".alert").alert("close");
            me.$chat_space_container.find(".mention-message").remove();
          });

        const message_info = {
          content: content,
          user: this.profile.user,
          room: chat_room,
          email: this.profile.user_email,
          is_first_message: this.is_first_message,
          attachment: attachment,
          sub_channel:
            this.last_active_sub_channel == chat_room
              ? ""
              : this.last_active_sub_channel,
          is_link: this.is_link,
          is_media: this.is_media,
          is_document: this.is_document,
          is_voice_clip: this.is_voice_clip,
          file_id: file_id,
          chat_topic: this.chat_topic,
          ...reply_message,
        };
        this.last_chat_space_message = await send_message(message_info);

        // ================= Handling with Doctypes Mentions =======================
        if (this.chat_topic) {
          await add_reference_doctype(
            mention_doctypes,
            this.chat_topic,
            this.last_active_sub_channel
          );
          await this.send_add_document_message(mention_doctypes, chat_room);
        } else {
          let results = await create_chat_topic(
            mention_doctypes,
            chat_room,
            this.last_active_sub_channel
          );
          // we must update the chat topic in the chat channel message
          // this.chat_topic = results[0].chat_topic
          await this.send_set_topic_message(
            mention_doctypes[0].docname,
            chat_room
          );
        }
        return;
      }
      // =========================================================================
      else if (mention_users.length > 0) {
        const me = this;
        const mentioned_users_emails =
          mention_users.length > 1
            ? mention_users.map((obj) => obj.email).join(", ")
            : mention_users[0].email;
        const mentioned_users_name =
          mention_users.length > 1
            ? mention_users.map((obj) => obj.name).join(", ")
            : mention_users[0].name;

        this.ask_to_join_template = `
        <div class="ask-to-join-container">
          <div class="alert alert-primary alert-dismissible btn fade show ask-to-join btn-primary" style="width:100%;text-align:left;" role="alert">
              ${frappe.utils.icon(
                "assign",
                "md"
              )} Ask <strong>${mentioned_users_name}</strong> to join
              <button id="close-ask-to-join" type="button" class="close" data-dismiss="alert" aria-label="Close">
              <span aria-hidden="true">×</span>
            </button>
          </div>          
          </div>
        <div>
        `;
        this.$chat_space_container.append(
          await this.make_message({
            content: this.ask_to_join_template,
            type: "mention-message",
            sender: this.profile.user,
          })
        );

        this.$chat_space_container
          .find(".ask-to-join")
          .on("click", function (e) {
            const old_sub_channel = me.last_active_sub_channel;
            $(this).alert("close");
            me.handle_mentions(
              mentioned_users_name,
              mentioned_users_emails,
              content,
              mention_users,
              chat_room,
              old_sub_channel
            );

            const tag_section_exists =
              me.$chat_space.find(".tag-section").length > 0;
            if (!tag_section_exists) {
              me.add_tag_section(me.contributors);
            } else {
              for (let i = 0; i < mention_users.length; i++) {
                this.tag_blot1 = new TagBlot({
                  $wrapper: me.$chat_space.find(".tags-container"),
                  profile: {
                    chat_space: me,
                    contributor_email: mention_users[i].email,
                    contributor_name: mention_users[i].name,
                  },
                });
                me.$chat_space.find(".tags-container").append(this.tag_blot1);
              }
            }
            return;
          });

        this.$chat_space_container
          .find("#close-ask-to-join")
          .on("click", function (e) {
            e.stopPropagation(); // Stops event from bubbling up to parent
            $(this).closest(".alert").alert("close");
            me.$chat_space_container.find(".mention-message").remove();
          });
      }
      // =========================================================================
      else if (mention_doctypes.length > 0) {
        let message_info = {
          content: content,
          user: this.profile.user,
          room: chat_room,
          email: this.profile.user_email,
          is_first_message: this.is_first_message,
          attachment: attachment,
          sub_channel:
            this.last_active_sub_channel == chat_room
              ? ""
              : this.last_active_sub_channel,
          is_link: this.is_link,
          is_media: this.is_media,
          is_document: this.is_document,
          is_voice_clip: this.is_voice_clip,
          file_id: file_id,
          chat_topic: this.chat_topic,
          ...reply_message,
        };

        if (this.chat_topic) {
          await add_reference_doctype(
            mention_doctypes,
            this.chat_topic,
            this.last_active_sub_channel
          );

          this.last_chat_space_message = await send_message(message_info);
          await this.send_add_document_message(mention_doctypes, chat_room);
        } else {
          let results = await create_chat_topic(
            mention_doctypes,
            chat_room,
            this.last_active_sub_channel
          );
          message_info["chat_topic"] = results[0].chat_topic;

          this.last_chat_space_message = await send_message(message_info);
          await this.send_set_topic_message(
            mention_doctypes[0].docname,
            chat_room
          );
        }
        return;
      }
    }
    // ================= End Handling with Mentions ===========================

    // handle_attachment returns a jQuery element; convert to HTML string before sending
    if (content && typeof content === "object" && content.prop) {
      content = content.prop("outerHTML") || "";
    }

    const message_info = {
      content: content,
      user: this.profile.user,
      room: chat_room,
      email: this.profile.user_email,
      is_first_message: this.is_first_message,
      attachment: attachment,
      sub_channel:
        this.last_active_sub_channel == chat_room
          ? ""
          : this.last_active_sub_channel,
      is_link: this.is_link,
      is_media: this.is_media,
      is_document: this.is_document,
      is_voice_clip: this.is_voice_clip,
      file_id: file_id,
      chat_topic: this.chat_topic,
      is_screenshot: is_screenshot,
      ...reply_message,
    };
    this.last_chat_space_message = await send_message(message_info);

    // Optimistic render: show sent message immediately without waiting for socket.io
    if (this.last_chat_space_message) {
      const send_date = frappe.datetime.now_datetime();
      this._locally_rendered_messages = this._locally_rendered_messages || new Set();
      this._locally_rendered_messages.add(this.last_chat_space_message);
      await this.receive_message(
        {
          content: content,
          sender_email: this.profile.user_email,
          user: this.profile.user,
          message_name: this.last_chat_space_message,
          send_date: send_date,
          message_type: "",
          message_template_type: "",
          reply_to: reply_message.reply_to || null,
          replied_message_sender: reply_message.replied_message_sender || null,
          replied_message_content: reply_message.replied_message_content || null,
        },
        get_time(send_date, this.profile.time_zone)
      );
    }

    // Clear typing state immediately so the indicator disappears for the recipient
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
    this.isTypingIndicatorActive = false;
    const _typing_room = this.profile.room_type === "Contributor"
      ? this.profile.parent_channel : this.profile.room;
    if (_typing_room) {
      this.callSetTypingAPI(this.profile.user_email, _typing_room, "false");
    }

    // Clear reply state
    this.reply_to_message = null;
    this.$chat_actions.find(".cc-reply-preview-container").removeClass("visible");

    hide_overlay();
  } //End handle_send_message

  async handle_mentions(
    mentioned_users_name,
    mentioned_users_emails,
    content,
    mention_users,
    chat_room,
    old_sub_channel
  ) {
    let contributors;
    const reply_message = this.reply_to_message
      ? {
          reply_to: this.reply_to_message.message_name,
          replied_message_sender: this.reply_to_message.sender_name,
          replied_message_content: this.reply_to_message.content,
        }
      : {
          reply_to: null,
          replied_message_sender: null,
          replied_message_content: null,
        };
    if (this.contributors && this.contributors.length > 0) {
      contributors = this.contributors.concat(mention_users);
    } else {
      contributors = mention_users;
    }
    this.contributors = contributors;

    const mention_msg = `
  <div class="add-user" data-template="added_user_template"><span class="sender-user" data-user="${this.profile.user_email}"></span><span> added </span><span class="receiver-user" data-user="${mentioned_users_emails}"></span></div>`;

    if (this.type_message_input) {
      this.type_message_input.clear();
    } else {
      this.$chat_actions.find(".type-message").val("");
    }
    this.voice_clip.$voice_clip.css("display", "none");
    this.$chat_actions.find(".message-send-button").css("display", "none");

    this.last_active_sub_channel = await create_sub_channel({
      new_contributors: mention_users,
      parent_channel: chat_room,
      user: this.profile.user,
      user_email: this.profile.user_email,
      last_active_sub_channel: this.last_active_sub_channel,
    });

    const mention_message_info = {
      content: mention_msg,
      user: this.profile.user,
      room: chat_room,
      email: this.profile.user_email,
      sub_channel:
        this.last_active_sub_channel == chat_room
          ? ""
          : this.last_active_sub_channel,
      message_type: "information",
      message_template_type: "Add User",
      chat_topic: this.chat_topic,
      ...reply_message,
    };
    await send_message(mention_message_info);
    update_sub_channel_for_last_message(
      this.profile.user,
      this.profile.user_email,
      mentioned_users_emails,
      this.last_chat_space_message,
      this.last_active_sub_channel,
      content,
      chat_room,
      old_sub_channel
    );
  }

  extract_mentions(message) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(message, "text/html");
    const mentions = doc.querySelectorAll(".mention");
    const contributors = [];
    const uniqueEmails = new Set();
    let mention_doctypes = [];

    mentions.forEach((mention) => {
      if (mention.getAttribute("data-is-doctype") != 1) {
        const email = mention.getAttribute("data-id");
        if (!uniqueEmails.has(email)) {
          uniqueEmails.add(email);
          contributors.push({
            name: mention.getAttribute("data-name"),
            email: email,
          });
        }
      } else
        mention_doctypes.push({
          doctype: mention.getAttribute("data-doctype"),
          docname: mention.getAttribute("data-id"),
        });
    });
    return { contributors: contributors, mention_doctypes: mention_doctypes };
  }

  async check_mentioned_user(mentioned_users) {
    const updatedMentionedUsers = mentioned_users.filter((mentioned) => {
      return !(
        this.chat_members.some((member) => member.email === mentioned.email) ||
        (this.contributors &&
          this.contributors.some(
            (contributor) => contributor.email === mentioned.email
          ))
      );
    });
    return updatedMentionedUsers;
  }

  async check_mention_doctypes(mention_doctypes) {
    const updatedMentionedDoctypes = mention_doctypes.filter((mentioned) => {
      return !(
        this.reference_doctypes &&
        this.reference_doctypes.some((doc) => doc.docname === mentioned.docname)
      );
    });
    return updatedMentionedDoctypes;
  }

  async create_direct_channel(content) {


    switch (this.profile.platform) {
      case "WhatsApp":
        this.platform_profile = "ClefinCode WhatsApp Profile";
        this.platform_gateway = window.erpnext_chat_app.res.default_whatsapp_number;
        break;
      case "Instagram":
        this.platform_profile = "ClefinCode Instagram Profile" ;
        this.platform_gateway = window.erpnext_chat_app.res.default_instagram_profile;
        break;
      case "Messenger":
        this.platform_profile = "ClefinCode Facebook Messenger Profile";
        this.platform_gateway = window.erpnext_chat_app.res.default_messenger_profile;
        break;
      case "Telegram":
        this.platform_profile = "ClefinCode Telegram Profile";
        this.platform_gateway = window.erpnext_chat_app.res.default_telegram_profile;
        break;
    }

    this.chat_members.push({
      email: this.profile.user_email,
      name: this.profile.user_email,
      platform: "Chat"      
    });
    this.chat_members.push({
      email: this.profile.contact,
      name: this.profile.room_name,
      platform: this.profile.platform,
      platform_profile: this.platform_profile,
      platform_gateway: this.platform_gateway
    });

    this.is_first_message = 1;
    let res = await frappe.call({
      method: "clefincode_chat.api.api_1_2_1.api.create_channel",
      args: {
        channel_name: "",
        users: this.chat_members,
        type: "Direct",
        last_message: content,
        creator_email: this.profile.user_email,
        creator: this.profile.user
      },
      callback: function (r) {
        return r.message;
      },
    });
    this.profile.room = res.message.results[0].room;
    this.set_channel_realtime(this.profile.room);
    this.$chat_space
      .closest(".chat-window")
      .attr("data-room", this.profile.room);
    frappe.ErpnextChat.settings.open_chat_space_rooms.push(this.profile.room);
    this.is_first_message = 0;
  }

  check_if_content_has_link(message_content) {
    const me = this;
    const parser = new DOMParser();
    const doc = parser.parseFromString(message_content, "text/html");

    const paragraphs = doc.querySelectorAll("p");

    paragraphs.forEach((p) => {
      const urlRegex =
        /((https?:\/\/|www\.|(?<![\w-])[\w-]+\.)[-\w.]+(:\d+)?(\/([\w/_\-.%]*(\?\S+)?)?)?)/gi;
      let link = "";
      Array.from(p.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const replacedText = node.textContent.replace(
            urlRegex,
            function (matched) {
              me.is_link = 1;
              if (!(matched.includes("http") || matched.includes("https"))) {
                link = "https://";
              }
              return (
                '<a href="' +
                link +
                matched +
                '" target="_blank" style="color:#027eb5">' +
                matched +
                "</a>"
              );
            }
          );
          const fragment = document
            .createRange()
            .createContextualFragment(replacedText);
          p.replaceChild(fragment, node);
        }
      });
    });
    return doc.body.innerHTML;
  }

  check_if_content_has_email(message_content) {
    const me = this;
    const parser = new DOMParser();
    const doc = parser.parseFromString(message_content, "text/html");

    const paragraphs = doc.querySelectorAll("p");

    paragraphs.forEach((p) => {
      const mailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      Array.from(p.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const replacedText = node.textContent.replace(
            mailRegex,
            function (matched) {
              me.is_link = 1;
              return (
                '<a href="mailto:' +
                matched +
                '" target="_blank" style="color:#027eb5">' +
                matched +
                "</a>"
              );
            }
          );
          const fragment = document
            .createRange()
            .createContextualFragment(replacedText);
          p.replaceChild(fragment, node);
        }
      });
    });
    return doc.body.innerHTML;
  }

  handle_attachment(file_url, file_name) {
    let $content;
    if (file_url.startsWith("/files") || file_url.startsWith("/private")) {
      if (is_image(file_name)) {
        this.is_media = 1;
        $content = $(document.createElement("a"));
        $content.attr({ href: file_url, target: "_blank" });
        $content.append(
          `<img src="${file_url}" class="img-responsive chat-image">`
        );
        $content.append(`<span class="hidden">${file_name}</span>`);
      } else if (is_video(file_name)) {
        this.is_media = 1;
        $content = $(document.createElement("div"));
        $content.append(
          `<video src="${file_url}" controls style="width:235px"></video>`
        );
        $content.append(`<span class="hidden">${file_name}</span>`);
      } else if (is_document(file_name)) {
        this.is_document = 1;
        $content = $(document.createElement("div"));
        $content.css("width", "235px");
        // alaa
        const excel = ["xlsx", "xls", "csv"];
        const word = ["doc", "docx"];
        const pdf = ["pdf"];
        const powerpoint = ["pptx", "ppt", "ppsx"];
        const rar = ["zip", "rar"];
        $content.addClass(
          "document-container d-flex flex-row justify-content-start align-items-center"
        );
        let extension = file_name.substring(file_name.lastIndexOf(".") + 1);
        if (word.includes(extension)) {
          $content.append(
            `<img style="height: 32px;margin-right: 8px;" src="/assets/clefincode_chat/images/docx.png">`
          );
        } else if (excel.includes(extension)) {
          $content.append(
            `<img style="height: 32px;margin-right: 8px;" src="/assets/clefincode_chat/images/xlsx.png">`
          );
        } else if (pdf.includes(extension)) {
          $content.append(
            `<img style="height: 32px;margin-right: 8px;" src="/assets/clefincode_chat/images/pdf-red.png">`
          );
        } else if (rar.includes(extension)) {
          $content.append(
            `<img style="height: 32px;margin-right: 8px;" src="/assets/clefincode_chat/images/rar.png">`
          );
        } else if (powerpoint.includes(extension)) {
          $content.append(
            `<img style="height: 32px;margin-right: 8px;" src="/assets/clefincode_chat/images/ppt.png">`
          );
        } else {
          $content.append(
            `<img style="height: 32px;margin-right: 8px;" src="/assets/clefincode_chat/images/txt.png">`
          );
        }

        $content.append(
          `<a href="${file_url}" target ="_blank" style="white-space: pre-wrap;word-break: break-word;">${file_name}</a>`
        );
      } else if (is_audio(file_name)) {
        this.is_document = 1;
        $content = $(document.createElement("audio"));
        $content.attr({ src: file_url, controls: "controls" });
        $content.addClass("voice-clip");
        $content.css("width", "235px");
        $content.append(file_name);
      } else if (is_voice_clip(file_name)) {
        this.is_voice_clip = 1;
        $content = this.create_canvas_clip(file_name);
      } else {
        frappe.msgprint("Unsupported type");
        return;
      }
    } else if (file_name) {
      this.is_link = 1;
      $content = $(document.createElement("a"));
      $content.attr({ href: file_url, target: "_blank" });
      $content.append(file_url);
      $content.css("color", "#027eb5");
    } else {
      frappe.msgprint("Unknown type");
    }

    return $content;
  }

  create_canvas_clip(file_name) {
    const me = this;
    let $content = $(document.createElement("div"));

    let $container = $(document.createElement("div"))
      .addClass("voice-clip-container")
      .attr("data-audio", file_name);

    let playbutton = `
  <button class="audio-btn" aria-label="Play voice message">
    <span data-icon="audio-play" class="">
      <svg viewBox="0 0 45 34" height="34" width="34" preserveAspectRatio="xMidYMid meet" class="" version="1.1" x="0px" y="0px" enable-background="new 0 0 34 34">
        <path fill="currentColor" d="M8.5,8.7c0-1.7,1.2-2.4,2.6-1.5l14.4,8.3c1.4,0.8,1.4,2.2,0,3l-14.4,8.3 c-1.4,0.8-2.6,0.2-2.6-1.5V8.7z"></path>
      </svg>
    </span>
    <span data-icon="audio-pause" class="stop-btn">
      <svg viewBox="0 0 45 34" height="34" width="34" preserveAspectRatio="xMidYMid meet" class="" version="1.1" x="0px" y="0px" enable-background="new 0 0 34 34">
        <path fill="currentColor" d="M9.2,25c0,0.5,0.4,1,0.9,1h3.6c0.5,0,0.9-0.4,0.9-1V9c0-0.5-0.4-0.9-0.9-0.9h-3.6 C9.7,8,9.2,8.4,9.2,9V25z M20.2,8c-0.5,0-1,0.4-1,0.9V25c0,0.5,0.4,1,1,1h3.6c0.5,0,1-0.4,1-1V9c0-0.5-0.4-0.9-1-0.9 C23.8,8,20.2,8,20.2,8z"></path>
      </svg>
    </span>
  </button>
  `;

    let $record = $(document.createElement("div"))
      .addClass("record-sec")
      .append($(document.createElement("div")).addClass("record-line"));
    let $canvas = $(document.createElement("canvas")).addClass("record-canvas");

    $record.find(".record-line").append($canvas);

    $container.append($record);
    $container.append(playbutton);

    //$content.append(file_name);

    setTimeout(function () {
      let parent = $(
        ".message-bubble .voice-clip-container[data-audio='" + file_name + "']"
      );
      let element = parent.find("canvas").first();
      me.draw_clip_in_canvas("/private/files/" + file_name, element);
      //me.draw_clip_in_canvas(file_url, $canvas)
    }, 3000);
    $content.append($container);
    return $content;
  }

  draw_clip_in_canvas(file_url, canvas) {
    const ctx = canvas[0].getContext("2d");
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const drawAudio = (url) => {
      fetch(url)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
        .then((audioBuffer) => {
          if (
            canvas.closest(".voice-clip-container").find(".duration").length > 0
          )
            return;

          const duration = audioBuffer.duration;
          canvas
            .closest(".voice-clip-container")
            .attr("data-duration", duration.toFixed(2));
          const minutes = Math.floor(duration / 60);
          const remainingSeconds = Math.floor(duration % 60);

          // Pad the minutes and seconds with leading zeros if needed
          const paddedMinutes = String(minutes).padStart(2, "0");
          const paddedSeconds = String(remainingSeconds).padStart(2, "0");

          let duration_html = $("<div></div>")
            .addClass("duration")
            .text(`${paddedMinutes}:${paddedSeconds}`);

          canvas.closest(".voice-clip-container").append(duration_html);
          draw(normalizeData(filterData(audioBuffer)));
        });
    };

    const filterData = (audioBuffer) => {
      const rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
      const samples = 70; // Number of samples we want to have in our final data set
      const blockSize = Math.floor(rawData.length / samples); // the number of samples in each subdivision
      const filteredData = [];
      for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i; // the location of the first sample in the block
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum = sum + Math.abs(rawData[blockStart + j]); // find the sum of all the samples in the block
        }
        filteredData.push(sum / blockSize); // divide the sum by the block size to get the average
      }

      return filteredData;
    };

    const normalizeData = (filteredData) => {
      const maxVal = Math.max(...filteredData);
      const multiplier = maxVal > 0 ? 2 / maxVal : 1;
      // const multiplier = Math.pow(Math.max(...filteredData), -1);
      return filteredData.map((n) => n * multiplier);
    };

    const draw = (normalizedData) => {
      // set up the canvas
      const dpr = window.devicePixelRatio || 1;
      const padding = 8;
      canvas[0].width = canvas.outerWidth() * dpr;
      canvas[0].height = canvas.outerHeight() * dpr;
      ctx.scale(dpr, dpr);
      ctx.translate(0, canvas.height() / 2); // set Y = 0 to be in the middle of the canvas
      // draw the line segments
      const width = canvas.outerWidth() / normalizedData.length;
      for (let i = 0; i < normalizedData.length; i++) {
        const x = width * i;
        let height = normalizedData[i] * canvas.height() - padding;
        if (height < 0) {
          height = 0;
        } else if (height > canvas.height() / 2) {
          height = Math.min(height, canvas.height() / 2);
        }
        drawLineSegment(ctx, x, height, width, (i + 1) % 2);
      }
    };

    const drawLineSegment = (ctx, x, height, width, isEven) => {
      ctx.lineWidth = 1; // how thick the line is
      ctx.strokeStyle = "#8f9294"; // what color our line is
      ctx.beginPath();
      ctx.moveTo(x, -height / 2);
      ctx.lineTo(x, height / 2);
      ctx.arc(x + width / 2, height, width / 2, Math.PI, 0, isEven);
      ctx.lineTo(x + width, 0);
      ctx.stroke();
    };
    drawAudio(file_url);
  }

  async receive_message(res, time) {
    this.messages_offset += 1;
    if (this.$chat_space_container.find(".date-line").length == 0) {
      this.$chat_space_container.prepend(
        this.make_date_line_html(res.send_date)
      );
    } else {
      this.$chat_space_container.append(
        this.make_date_line_html(res.send_date)
      );
    }

    let chat_type = "recipient-message";
    if (res.sender_email == this.profile.user_email) {
      chat_type = "sender-message";
    }
    
    if (this.profile.room_type === "Guest") {
      if (this.profile.is_admin === true && res.user !== "Guest" && res.sender_email === this.profile.user_email) {
        chat_type = "sender-message";
      } else if (this.profile.is_admin === true && res.user === "Guest") {
        chat_type = "recipient-message";
      }
    }

    if (res.message_type == "information") {
      chat_type = "info-message";
    }

    if (this.add_member_again == 1) {
      this.add_member_again = 0;
      this.messages_offset = 0;
      await this.fetch_and_setup_messages();
    } else {
      let message_content = await this.make_message({
        content: res.content,
        time: time,
        type: chat_type,
        sender: res.user,
        message_name: res.message_name,
        message_template_type: res.message_template_type,
        reply_to: res.reply_to,
        replied_message_sender: res.replied_message_sender,
        replied_message_content: res.replied_message_content,
      });
      let attributeFound = false;
      let file_name = "";
      message_content.find("*").each(function () {
        if ($(this).attr("data-audio") !== undefined) {
          attributeFound = true;
          file_name = $(this).attr("data-audio");
          return false; // Breaks the loop once the attribute is found
        }
      });
      if (attributeFound) {
        let me = this;
        setTimeout(function () {
          let parent = $(
            ".message-bubble .voice-clip-container[data-audio='" +
              file_name +
              "']"
          );
          let element = parent.find("canvas").first();
          me.draw_clip_in_canvas("/private/files/" + file_name, element);
        }, 500);
      }
      // Remove typing indicator for this sender now that their message arrived
      this._removeTypingBubble(res.sender_email);
      if (this._active_typing_users) this._active_typing_users.delete(res.sender_email);

      this.$chat_space_container.append(message_content);
      scroll_to_bottom(this.$chat_space_container);
    }
    this.prevMessage = res;
  }

  render() {
    const me = this;
    this.$wrapper.css("display", "");
    this.$wrapper.html(this.$chat_space);
    if (this.$chat_space_container && this.$chat_space_container.length > 0) {
      this.$chat_space_container.animate(
        { scrollTop: this.$chat_space_container.prop("scrollHeight") },
        "fast"
      );
    }
    this.setup_events();
  }

  checkScrollCondition() {
    if (
      this.$chat_space_container.scrollTop() +
        this.$chat_space_container.innerHeight() <
      this.$chat_space_container[0].scrollHeight
    ) {
      scroll_to_bottom(this.$chat_space_container);
    }
  }

  async set_channel_realtime(targetChannel) {
    const me = this;
    frappe.realtime.on(targetChannel, async function (res) {
      if (res.realtime_type == "create_sub_channel") {
        const last_active_sub_channel_before_realtime =
          me.last_active_sub_channel;
        me.last_active_sub_channel = res.sub_channel;
        if (me.profile.room_type == "Contributor") {
          if (!me.last_active_sub_channel) {
            me.$chat_actions.remove();
            me.$chat_actions = null;
            return;
          }
          const is_active_contributor = await me.is_active_contributor();
          if (is_active_contributor == 0) {
            me.last_active_sub_channel = "";
            me.$chat_actions.remove();
            me.$chat_actions = null;
          } else {
            frappe.realtime.off(last_active_sub_channel_before_realtime);
            me.set_channel_realtime(me.last_active_sub_channel);
            me.contributors = await get_sub_channel_members(
              me.last_active_sub_channel,
              me.profile.user_email
            );
            me.add_tag_section(me.contributors, 1);
            if (!me.$chat_actions) {
              await me.setup_actions();
              me.setup_events();
            }
          }
        } else if (me.last_active_sub_channel == me.profile.room) {
          me.last_active_sub_channel = "";
          me.contributors = await get_contributors(me.profile.room);
          me.add_tag_section(me.contributors, 1);
        } else if (me.last_active_sub_channel) {
          me.contributors = await get_contributors(me.profile.room);
          me.add_tag_section(me.contributors, 1);
        }
      } else if (res.realtime_type == "send_message") {
        if (res.sender_email != me.profile.user_email) {
          if (
            (me.profile.room_type == "Contributor" &&
              frappe.ErpnextChat.settings.open_chat_space_rooms.includes(
                me.profile.parent_channel
              )) ||
            (me.profile.room_type != "Contributor" &&
              frappe.ErpnextChat.settings.open_chat_space_rooms.includes(
                me.profile.room
              ))
          ) {
            frappe.utils.play_sound("chat-message-receive");
          }
        }

        if (
          me.profile.room_type == "Contributor" &&
          frappe.ErpnextChat.settings.open_chat_space_rooms.includes(
            me.profile.parent_channel
          )
        ) {
          mark_messsages_as_read(
            me.profile.user_email,
            null,
            me.profile.parent_channel
          );
        } else if (
          frappe.ErpnextChat.settings.open_chat_space_rooms.includes(
            me.profile.room
          )
        ) {
          mark_messsages_as_read(me.profile.user_email, me.profile.room);
        }
        if (me._locally_rendered_messages && me._locally_rendered_messages.has(res.message_name)) {
          me._locally_rendered_messages.delete(res.message_name);
        } else {
          me.receive_message(res, get_time(res.send_date, me.profile.time_zone));
        }
      } else if (res.realtime_type == "add_group_member") {
        if (
          res.added_user_email.some(
            (user) => user.email === me.profile.user_email
          )
        ) {
          me.profile.is_removed = 0;
          me.profile.remove_date = null;
          me.messages_offset = 0;
          me.messages_limit = 10;
          me.$chat_actions.remove();
          me.add_member_again = 1;
        }
        await me.get_chat_members();
      } else if (res.realtime_type == "remove_group_member") {
        if (res.removed_user_email == me.profile.user_email) {
          me.$chat_actions.html(
            `<div class='text-center'>You can't send messages to this group because you're no longer a participant. </div>`
          );
          me.profile.is_removed = 1;
          me.profile.remove_date = res.remove_date;
          // check if user not in chat details page
          if (
            !(
              me.$wrapper.find(".chat-info") &&
              me.$wrapper.find(".chat-info").length > 0
            )
          ) {
            me.render_mentioned_doctype_section(me.chat_topic_subject);
          }
        }
        const removed_member = {
          name: res.removed_user,
          email: res.removed_user_email,
        };
        const exists = me.chat_members.some(
          (obj) => obj.email === removed_member.email
        );
        if (exists) {
          me.chat_members = me.chat_members.filter(
            (user) => user.email !== removed_member.email
          );
        }
      } else if (res.realtime_type == "rename_group") {
        me.$chat_space
          .find(".chat-profile-name")
          .text(
            res.new_group_name.length > 20
              ? res.new_group_name.substring(0, 20) + "..."
              : res.new_group_name
          )
          .attr("title", res.new_group_name);
      } else if (res.realtime_type == "typing") {
        let channel =
          me.profile.room_type == "Contributor"
            ? me.profile.parent_channel
            : me.profile.room;

        if (res.channel === channel) {
          if (res.is_typing == "true" && res.user !== me.profile.user_email) {
            me.showTypingIndicator(res.first_name, res.mobile_app, res.user);
          }
          // for mobile app
          if (
            res.mobile_app == "1" &&
            res.is_typing == "false" &&
            res.user !== me.profile.user_email
          ) {
            me.hideTypingIndicator(res.user);
          }
        }
      }else if (res.realtime_type == "show_template") {
      
        
       
          if (res.user === me.profile.user_email && res.template && res.template.length > 0) {
            me.showTemplateSuggestions(res);
          } 
      }
       else if (res.realtime_type == "set_topic") {
        me.chat_topic = res.chat_topic;
        me.reference_doctypes = me.reference_doctypes.concat(
          res.mention_doctypes
        );
        me.chat_topic_status = "private";
        me.render_mentioned_doctype_section(res.mention_doctypes[0].docname);
      } else if (res.realtime_type == "add_doctype") {
        // empty chat topic
        if (!me.chat_topic && me.reference_doctypes.length == 0) {
          me.render_mentioned_doctype_section(res.mention_doctypes[0].docname);
        }
        me.reference_doctypes = me.reference_doctypes.concat(
          res.mention_doctypes
        );
      } else if (res.realtime_type == "reaction_update") {
        me.update_message_reactions(res.message_name, res.reactions);
      } else if (res.realtime_type == "remove_topic") {
        me.$chat_space.find(".mentioned-doctype-section").remove();
        me.chat_topic = null;
        me.reference_doctypes = [];
      } else if (res.realtime_type == "remove_doctype") {
        if (!me.chat_topic_subject) {
          if (res.removed_doctype == me.reference_doctypes[0].docname) {
            me.$chat_space
              .find(".mentioned-doctype-section")
              .find(".chat_topic_subject")
              .html(
                me.reference_doctypes[1].docname.length > 30
                  ? me.reference_doctypes[1].docname.substring(0, 30) + "..."
                  : me.reference_doctypes[1].docname
              );
          }
        }

        if (me.reference_doctypes.length == 1) {
          me.reference_doctypes = [];
        } else {
          me.reference_doctypes = me.reference_doctypes.filter(
            (doc) => doc.docname !== res.removed_doctype
          );
        }
      } else if (res.realtime_type == "rename_topic") {
        me.$chat_space
          .find(".mentioned-doctype-section")
          .find(".chat_topic_subject")
          .html(
            res.new_subject.length > 30
              ? res.new_subject.substring(0, 30) + "..."
              : res.new_subject
          );
        me.chat_topic_subject = res.new_subject;
      } else if (res.realtime_type == "set_topic_status") {
        let chat_topic_status_icon = `<img title="private topic" src="/assets/clefincode_chat/icons/eye-slash.svg">`;
        if (res.chat_topic_status == "public") {
          chat_topic_status_icon = `<img title="public topic" src="/assets/clefincode_chat/icons/eye.svg">`;
        }
        me.$chat_space
          .find(".mentioned-doctype-section")
          .find(".topic-status")
          .html(chat_topic_status_icon);
        me.chat_topic_status = res.chat_topic_status;
      }
    });

    this.start_message_polling();
    this.start_typing_polling();
    this.start_reaction_polling();
  }

  start_reaction_polling() {
    if (this._reaction_polling_interval) {
      clearInterval(this._reaction_polling_interval);
    }
    const me = this;
    me._reaction_poll_since = new Date(Date.now() - 5000).toISOString().replace("T", " ").split(".")[0];

    me._reaction_polling_interval = setInterval(() => {
      if (!me.profile.room || !me.$chat_space_container) return;

      const poll_room = me.profile.room_type === "Contributor" && me.last_active_sub_channel
        ? me.last_active_sub_channel : me.profile.room;

      const params = new URLSearchParams({
        room: poll_room,
        user_email: me.profile.user_email,
        since: me._reaction_poll_since,
      });

      fetch("/api/method/clefincode_chat.api.api_1_2_1.api.get_reaction_updates", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Frappe-CSRF-Token": frappe.csrf_token,
          "Accept": "application/json",
        },
        body: params,
      })
        .then((res) => res.json())
        .then((data) => {
          const updates = (data && data.message && data.message.updates) || [];
          for (const update of updates) {
            me.update_message_reactions(update.message_name, update.reactions);
            if (update.timestamp > me._reaction_poll_since) {
              me._reaction_poll_since = update.timestamp;
            }
          }
        })
        .catch(() => {});
    }, 3000);
  }

  start_typing_polling() {
    if (this._typing_polling_interval) {
      clearInterval(this._typing_polling_interval);
    }
    const me = this;
    me._active_typing_users = new Set();

    me._typing_polling_interval = setInterval(() => {
      if (!me.profile.room || !me.$chat_space_container) return;

      const poll_room = me.profile.room_type === "Contributor" && me.last_active_sub_channel
        ? me.last_active_sub_channel : me.profile.room;

      const params = new URLSearchParams({
        room: poll_room,
        user_email: me.profile.user_email,
      });

      fetch("/api/method/clefincode_chat.api.api_1_3_1.api.get_typing_state", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Frappe-CSRF-Token": frappe.csrf_token,
          "Accept": "application/json",
        },
        body: params,
      })
        .then((res) => res.json())
        .then((data) => {
          const typers = (data && data.message && data.message.typers) || [];
          const current_typer_emails = new Set(typers.map((t) => t.user));

          // Show new typers
          for (const typer of typers) {
            if (!me._active_typing_users.has(typer.user)) {
              me.showTypingIndicator(typer.first_name, 0, typer.user);
            }
          }
          // Hide typers who stopped
          for (const old_user of me._active_typing_users) {
            if (!current_typer_emails.has(old_user)) {
              me._removeTypingBubble(old_user);
            }
          }
          me._active_typing_users = current_typer_emails;
        })
        .catch(() => {});
    }, 1500);
  }

  start_message_polling() {
    if (this._polling_interval) {
      clearInterval(this._polling_interval);
    }
    const me = this;
    // Use UTC as the starting filter date (5s buffer to avoid missing in-flight msgs)
    me._poll_from_date = new Date(Date.now() - 5000).toISOString().replace("T", " ").split(".")[0];
    me._poll_in_progress = false;

    me._polling_interval = setInterval(() => {
      if (me._poll_in_progress || !me.profile.room || !me.$chat_space_container) return;
      me._poll_in_progress = true;

      const poll_room = me.profile.room_type === "Contributor" && me.last_active_sub_channel
        ? me.last_active_sub_channel : me.profile.room;

      const params = new URLSearchParams({
        room: poll_room,
        user_email: me.profile.user_email,
        room_type: me.profile.room_type,
        lastmessagedate: me._poll_from_date,
        cmd: "clefincode_chat.api.api_1_3_1.api.get_messages_latest",
      });

      fetch("/api/method/clefincode_chat.api.api_1_3_1.api.get_messages_latest", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Frappe-CSRF-Token": frappe.csrf_token,
          "Accept": "application/json",
        },
        body: params,
      })
        .then((res) => res.json())
        .then(async (r) => {
          const messages = r && r.message && r.message.results;
          if (!messages || !messages.length) return;
          for (const msg of messages) {
            if (!me.$chat_space_container) break;
            if (me.$chat_space_container.find(`[data-message-name="${msg.message_name}"]`).length) {
              if (msg.utc_message_date) me._poll_from_date = msg.utc_message_date;
              continue;
            }
            await me.receive_message(
              {
                content: msg.content,
                sender_email: msg.sender_email,
                user: msg.sender,
                message_name: msg.message_name,
                send_date: msg.send_date,
                message_type: msg.message_type || "",
                message_template_type: msg.message_template_type || "",
                reply_to: null,
                replied_message_sender: null,
                replied_message_content: null,
              },
              get_time(msg.send_date, me.profile.time_zone)
            );
            if (msg.utc_message_date) me._poll_from_date = msg.utc_message_date;
          }
        })
        .catch((err) => console.error("[CC Poll]", err))
        .finally(() => {
          me._poll_in_progress = false;
        });
    }, 3000);
  }

  stop_message_polling() {
    if (this._polling_interval) {
      clearInterval(this._polling_interval);
      this._polling_interval = null;
    }
    if (this._typing_polling_interval) {
      clearInterval(this._typing_polling_interval);
      this._typing_polling_interval = null;
    }
    if (this._reaction_polling_interval) {
      clearInterval(this._reaction_polling_interval);
      this._reaction_polling_interval = null;
    }
  }

  async get_last_active_sub_channel() {
    let is_active_contributor = 1;
    if (this.profile.room_type == "Contributor") {
      this.last_active_sub_channel = await get_last_active_sub_channel(
        this.profile.parent_channel
      );
      if (!this.last_active_sub_channel) {
        return;
      }
      is_active_contributor = await check_if_contributor_active(
        this.last_active_sub_channel,
        this.profile.user_email
      );
      if (is_active_contributor == 0) {
        this.last_active_sub_channel = "";
      }
    } else {
      this.last_active_sub_channel = await get_last_active_sub_channel(
        this.profile.room
      );
    }
  }

  async add_tag_section(contributors, reset = 0) {
    const tag_section_exists = this.$chat_space.find(".tag-section").length > 0;
    if (contributors && contributors.length > 0) {
      const tag_section = `
    <div class="tag-section">
      <div class='show-contributors'><span class="contributors_count_icon" onclick = "openAll(this);">${frappe.utils.icon(
        "users",
        "md"
      )}</span> </div>
      <div class='tags-container'>  
      </div>
    </div>
    
    <script>
      function openAll(el) {
        
        $(el).closest('.chat-space').find('.tags-container').css("display","flex")
        $(el).closest('.tag-section').css("botton","63px")
        $(el).closest('.tag-section').css("overflow","auto")
        $(el).closest('.tag-section').find(".tag-blot").removeClass("tag-blot-hidden");
      }

      $(document).on('click', function (e) {
        if ($(e.target).closest(".tag-section").length === 0) {
            $(e.target).closest('.chat-space').find(".tags-container").hide();
        }
      }); 

    </script>`;

      if (tag_section_exists && reset == 1) {
        await this.$chat_space.find(".tag-section").remove();
      }

      if (!tag_section_exists || reset == 1) {
        await this.$chat_space.find(".message-send-button").after(tag_section);
      }

      this.add_tag_blot(contributors);
    } else if (tag_section_exists) {
      this.$chat_space.find(".tag-section").remove();
    }
  }

  async add_tag_blot(contributors) {
    if (contributors.length > 0) {
      for (let i = 0; i < contributors.length; i++) {
        this.tag_blot = new TagBlot({
          $wrapper: this.$chat_space.find(".tags-container"),
          profile: {
            chat_space: this,
            contributor_email: contributors[i].email,
            contributor_name: contributors[i].name,
          },
        });
        this.$chat_space.find(".tags-container").append(this.tag_blot);
        var count = this.$chat_space.find(".tag-blot").length;
        if (count > 0) {
          this.$chat_space.find(".tag-blot").addClass("tag-blot-hidden");
        }
      }
    }
  }

  async get_all_sub_channels_for_contributor() {
    if (this.profile.room_type == "Contributor") {
      this.all_sub_channels_for_contributor =
        await get_all_sub_channels_for_contributor(
          this.profile.parent_channel,
          this.profile.user_email
        );
    }
  }

  async is_active_contributor() {
    return await check_if_contributor_active(
      this.last_active_sub_channel,
      this.profile.user_email
    );
  }

  async on_scroll() {
    this.$chat_space.find(".cc-global-reaction-palette").removeClass("active");
    const me = this;
    // loading old messages
    if (me.$chat_space_container.scrollTop() == 0) {
      if (me.loading_messages_timeout) {
        clearTimeout(me.loading_messages_timeout);
        me.loading_messages_timeout = null;
      }
      me.loading_messages_timeout = setTimeout(async () => {
        me.messages_offset += 10;
        let res;
        if (me.profile.room_type == "Contributor") {
          res = await get_messages(
            me.all_sub_channels_for_contributor,
            me.profile.user_email,
            me.profile.room_type,
            null,
            null,
            me.messages_limit,
            me.messages_offset
          );
        } else if (me.profile.room_type == "Topic") {
          res = await get_messages(
            "",
            me.profile.user_email,
            me.profile.room_type,
            me.chat_topic_space,
            me.profile.remove_date,
            me.messages_limit,
            me.messages_offset
          );
        } else {
          res = await get_messages(
            me.profile.room,
            me.profile.user_email,
            me.profile.room_type,
            null,
            me.profile.remove_date,
            me.messages_limit,
            me.messages_offset
          );
        }
        await me.make_messages_html(res.results, 1);
        me.$chat_space_container.prepend(me.message_html);
        if (res.results.length != 0) {
          me.$chat_space_container.off("scroll");
          me.$chat_space_container.scrollTop(300);
          me.$chat_space_container.on("scroll", function () {
            me.on_scroll();
          });
        }
      }, 300);
    }
    // show the scroll down icon
    const $chatBox = me.$chat_space_container;
    const st = me.$chat_space_container.scrollTop();
    const totalHeight = $chatBox.prop("scrollHeight");
    const visibleHeight = $chatBox.outerHeight();

    const scrollableHeight = totalHeight - visibleHeight;

    const scrollUpThreshold =
      (me.scrollUpThresholdPercent / 100) * scrollableHeight;
    const bottomThreshold =
      (me.bottomThresholdPercent / 100) * scrollableHeight;
    var arrowButton = me.$chat_space_container.find(".arrow-button");

    if (st < me.lastScrollTop && st < scrollUpThreshold) {
      // Show button only if scrolled up beyond threshold percentage
      arrowButton.css("display", "inline-flex");
    } else if (st + visibleHeight >= totalHeight - bottomThreshold) {
      // Hide button if scrolled to the bottom (within threshold percentage)
      arrowButton.css("display", "none");
    }

    me.lastScrollTop = st; // Update last scroll position
  }
async setupTypingIndicator(textValue) {
    let user = this.profile.user_email;
    let room;

    if (this.profile.room_type == "Contributor") {
      room = this.profile.parent_channel;
    } else {
      room = this.profile.room;
    }
   
    if (textValue && textValue.startsWith("/")) {
      this.callSetTypingAPI(user, room, "true", textValue);
      
    } else {
    
      this.callSetTypingAPI(user, room, "true");
    }



    setTimeout(async () => {
      this.isTypingIndicatorActive = false;
    }, 2500);

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    // for mobile app
    this.typingTimeout = setTimeout(async () => {
      this.callSetTypingAPI(user, room, "false");
    }, 3000);
  }

  callSetTypingAPI(user, room, isTyping,textValue) {
    console.log(textValue);
    frappe.call({
      method: "clefincode_chat.api.api_1_3_1.api.set_typing",
      args: {
        user: user,
        room: room,
        is_typing: isTyping,
        last_active_sub_channel: this.last_active_sub_channel,
        text: textValue,
      },
    });
  }

  showTypingIndicator(user, mobile_app, user_email) {
    if (!this.$chat_space_container) return;
    // Remove existing indicator for this user
    this.$chat_space_container.find(`.cc-typing-indicator[data-typing-user="${user_email}"]`).remove();
    const bubble_html = `
      <div class="cc-typing-indicator" data-typing-user="${user_email}">
        <div class="cc-typing-bubble">
          <span></span><span></span><span></span>
        </div>
      </div>`;
    this.$chat_space_container.append(bubble_html);
    this.$chat_space_container.animate(
      { scrollTop: this.$chat_space_container.prop("scrollHeight") }, "fast"
    );
    // Auto-hide as fallback if polling / socket.io doesn't fire the hide
    if (this.showTypingIndicatorTimeout) {
      clearTimeout(this.showTypingIndicatorTimeout);
    }
    this.showTypingIndicatorTimeout = setTimeout(() => {
      this._removeTypingBubble(user_email);
    }, 5000);
  }

  _removeTypingBubble(user_email) {
    if (!this.$chat_space_container) return;
    if (user_email) {
      this.$chat_space_container.find(`.cc-typing-indicator[data-typing-user="${user_email}"]`).remove();
    } else {
      this.$chat_space_container.find(".cc-typing-indicator").remove();
    }
  }
showTemplateSuggestions(res) {
  console.log(res);
    const chatWindow = $(`.chat-window[data-room="${res.room}"]`);
  if (!chatWindow.length) {
    console.warn("Chat window not found for room:", res.room);
    return;
  }

  const editor = chatWindow.find(".type-message");


  chatWindow.find("#template-suggestions").remove();
  
  const container = $(`
   <div id="template-suggestions"
  style="
    position:absolute;
    background:#fff;
    border:1px solid #ccc;
    border-radius:6px;
    box-shadow:0 4px 10px rgba(0,0,0,0.15);
    padding:8px;
    z-index:500;
    max-height:220px;
    overflow-y:auto;
    font-size:13px;
    width:256px;
    opacity:0;
    transform:translateY(10px);
    transition:all 0.25s ease;
  ">
</div>
  `);
  
  res.template.forEach((t) => {
    const name = t.name || "Unnamed Template";
    const doctype_type=t.doctype

   const item = $(`
  <div style="padding:8px; cursor:pointer; border-bottom:1px solid #eee;">
    <table style="width:100%; font-size:13px;">
      <tr>
        <td style="font-weight:bold; color:#333;">${t.meta_template_name || t.template_name}</td>
       
      </tr>
      
    </table>
  </div>
`);

    item.hover(
      function () {
        $(this).css("background", "#e6dedeff");
      },
      function () {
        $(this).css("background", "transparent");
      }
    );

   item.on("click", async function () {
    editor.text("/" + name);
    container.fadeOut(200, () => container.remove());

    const check = await check_reference_doctype_empty(name, doctype_type);

    // Determine template type based on the doctype
    let template_type = (doctype_type === "Clefincode Chat Template")
        ? "Send Template Public"
        : "Send Template";

    if (check.empty) {
        const message_info = {
            content: name,
            user: res.user,
            room: res.room,
            email: res.user,
            message_type: "information",
            message_template_type: template_type
        };

        send_message(message_info);
        editor.html("");
    }
    else {
        let topic_info = await get_topic_info(res.room);

        if (!topic_info || !topic_info.length) {
            console.error("topic_info is empty", topic_info);
            return;
        }

        let topic = topic_info[0];
        let reference_doctypes = topic.reference_doctypes;

        // If doctype exists in reference list
        if (reference_doctypes.some(d => d.doctype === check.value)) {
            console.log("Value exists in reference_doctypes");
        }

        // Select docname
        show_doctype_selector(check.value, function (selected_docname) {

            const message_info = {
                content: name + "," + selected_docname,
                user: res.user,
                room: res.room,
                email: res.user,
                message_type: "information",
                message_template_type: template_type
            };

            send_message(message_info);
            editor.html("");
        });
    }
});


    container.append(item);
  });

  
  editor.parent().css("position", "relative");
  editor.after(container);

  
  const rect = editor[0].getBoundingClientRect();
  const containerHeight = container.outerHeight();

  container.css({
    top: -(containerHeight + 5) + "px",
    left: "0px",
    width: rect.width + "px",
  });

  setTimeout(() => {
    container.css({
      opacity: "1",
      transform: "translateY(0)",
    });
  }, 10);
}
insertTemplateText (text) {
  const editor = me.$chat_actions.find(".type-message");
  if (editor && editor.length > 0) {
    editor.text(text);
  }
};
  async hideTypingIndicator(user_email) {
    this._removeTypingBubble(user_email);
  }

  render_mentioned_doctype_section(docname) {
    const me = this;
    if (
      me.$chat_space.find(".mentioned-doctype-section") &&
      me.$chat_space.find(".mentioned-doctype-section").length > 0
    ) {
      me.$chat_space.find(".mentioned-doctype-section").remove();
    }
    let chat_topic_status_icon =
      me.chat_topic_status && me.chat_topic_status == "private"
        ? `<img title="private topic" src="/assets/clefincode_chat/icons/eye-slash.svg">`
        : `<img  title="public topic" src="/assets/clefincode_chat/icons/eye.svg">`;
    if (me.chat_topic && me.reference_doctypes.length == 0 && !docname) {
      docname = me.chat_topic_subject;
    } else if (!docname && me.reference_doctypes.length > 0) {
      docname = me.reference_doctypes[0].docname;
    }
    const mentioned_doctype_section = `
  <div class="mentioned-doctype-section">
    <div style="flex:1;margin-left:8px">
      <span><img src="/assets/clefincode_chat/icons/tag.svg"> </span><span class="chat_topic_subject" title="${docname}">${
      docname.length > 30 ? docname.substring(0, 30) + "..." : docname
    }</span>
    </div>
    <div> 
      <span class="topic-status mr-2">${chat_topic_status_icon}</span>     
      ${
        this.profile.room_type != "Contributor" && this.profile.is_removed != 1 && this.profile.user_type != "website_user"
          ? `
      <span class="edit-chat-topic-subject mr-2" ><img src="/assets/clefincode_chat/icons/edit.svg"></span>
      <span class="remove-topic" ><img src="/assets/clefincode_chat/icons/close.svg"></span>
      `
          : ``
      }
    </div>
  </div>`;

    this.$chat_space.find(".chat-header").after(mentioned_doctype_section);

    this.$chat_space.find(".remove-topic").on("click", function () {
      frappe.confirm(
        "Are you sure you want to remove this topic?",
        async function () {
          const chat_channel =
            me.profile.room_type == "Contributor"
              ? me.profile.parent_channel
              : me.profile.room;
          let chat_topic_subject = "";
          if (me.chat_topic_subject) {
            chat_topic_subject = me.chat_topic_subject;
          } else {
            chat_topic_subject = me.reference_doctypes[0].docname;
          }
          await remove_chat_topic(
            me.chat_topic,
            chat_channel,
            me.last_active_sub_channel
          );
          await me.send_remove_topic_message(chat_channel, chat_topic_subject);
        }
      );
    });

    this.$chat_space.find(".edit-chat-topic-subject").on("click", function () {
      const chat_channel =
        me.profile.room_type == "Contributor"
          ? me.profile.parent_channel
          : me.profile.room;
      var d = new frappe.ui.Dialog({
        title: "Edit Topic Subject",
        fields: [
          {
            label: "New Subject",
            fieldname: "chat_topic_subject",
            fieldtype: "Data",
            length: 50,
            reqd: 1,
          },
        ],
        primary_action: function () {
          var data = d.get_values();

          frappe.call({
            method: "clefincode_chat.api.api_1_2_1.api.set_topic_subject",
            args: {
              chat_topic: me.chat_topic,
              new_subject: data.chat_topic_subject,
              chat_channel: chat_channel,
              last_active_sub_channel: me.last_active_sub_channel,
            },
            callback: function (r) {
              if (!r.exc) {
                me.send_rename_topic_message(
                  data.chat_topic_subject,
                  chat_channel
                );
                d.hide();
              }
            },
          });
        },
        primary_action_label: "Edit",
      });
      d.show();
    });

    if (
      this.profile.room_type != "Contributor" &&
      this.profile.is_removed != 1 && 
      this.profile.user_type != "website_user"
    ) {
      this.$chat_space.find(".topic-status").on("click", function () {
        const chat_channel =
          me.profile.room_type == "Contributor"
            ? me.profile.parent_channel
            : me.profile.room;
        let toggle_chat_topic_status =
          me.chat_topic_status && me.chat_topic_status == "private"
            ? "public"
            : "private";
        var d = new frappe.ui.Dialog({
          title: "Confirm Action",
          fields: [
            {
              label: "Are you sure you want to proceed?",
              fieldtype: "HTML",
              options: `Are you sure you want to set topic as ${toggle_chat_topic_status}?`,
            },
          ],
          primary_action_label: `Set as ${toggle_chat_topic_status}`,
          async primary_action() {
            frappe.call({
              method: "clefincode_chat.api.api_1_2_1.api.set_topic_status",
              args: {
                chat_topic: me.chat_topic,
                chat_topic_status: toggle_chat_topic_status,
                chat_channel: chat_channel,
                last_active_sub_channel: me.last_active_sub_channel,
              },
              callback: async function (r) {
                if (!r.exc) {
                  const content = `
                <div class="set-topic-status" data-template = "set_topic_status_template">
                <span class="sender-user" data-user="${me.profile.user_email}"></span><span> set topic as ${toggle_chat_topic_status}</span>
                </div>`;

                  const message_info = {
                    content: content,
                    user: me.profile.user,
                    room: me.profile.room,
                    email: me.profile.user_email,
                    message_type: "information",
                    send_date: get_time(
                      frappe.datetime.now_time(),
                      me.profile.time_zone
                    ),
                    message_template_type: "Set Topic Status",
                    sub_channel: me.last_active_sub_channel,
                    chat_topic: me.chat_topic,
                  };
                  await send_message(message_info);
                  d.hide();
                }
              },
            });
          },
        }).show();
      });
    }
  }

  async send_set_topic_message(docname, chat_channel) {
    const mention_msg_info = `
    <div class="set-topic" data-template = "set_topic_template">
    <span class="sender-user" data-user="${this.profile.user_email}"></span><span> set topic: "${docname}" </span>
    </div>`;

    const message_info = {
      content: mention_msg_info,
      user: this.profile.user,
      room: chat_channel,
      email: this.profile.user_email,
      message_type: "information",
      send_date: get_time(frappe.datetime.now_time(), this.profile.time_zone),
      message_template_type: "Set Topic",
      sub_channel: this.last_active_sub_channel,
      chat_topic: this.chat_topic,
    };

    await send_message(message_info);
  }

  async send_remove_topic_message(chat_channel, chat_topic_subject) {
    if (!chat_topic_subject) {
      chat_topic_subject = this.reference_doctypes[0].docname;
    }
    const mention_msg_info = `
    <div class="remove-topic" data-template = "remove_topic_template">
    <span class="sender-user" data-user="${this.profile.user_email}"></span><span> removed topic: "${chat_topic_subject}" </span>
    </div>`;

    const message_info = {
      content: mention_msg_info,
      user: this.profile.user,
      room: chat_channel,
      email: this.profile.user_email,
      message_type: "information",
      send_date: get_time(frappe.datetime.now_time(), this.profile.time_zone),
      message_template_type: "Remove Topic",
      sub_channel: this.last_active_sub_channel,
      chat_topic: this.chat_topic,
    };

    await send_message(message_info);
  }

  async send_rename_topic_message(new_subject, chat_channel) {
    const mention_msg_info = `
    <div class="rename-topic" data-template = "rename_topic_template">
    <span class="sender-user" data-user="${this.profile.user_email}"></span><span> changed the topic's subject to "${new_subject}" </span>
    </div>`;

    const message_info = {
      content: mention_msg_info,
      user: this.profile.user,
      room: chat_channel,
      email: this.profile.user_email,
      message_type: "information",
      send_date: get_time(frappe.datetime.now_time(), this.profile.time_zone),
      message_template_type: "Rename Topic",
      sub_channel: this.last_active_sub_channel,
      chat_topic: this.chat_topic,
    };

    await send_message(message_info);
  }

  async send_add_document_message(docnames, chat_channel) {
    let documents =
      docnames.length > 1
        ? docnames.map((obj) => obj.docname).join(", ")
        : docnames[0].docname;
    const mention_msg_info = `
    <div class="add-doctype" data-template = "add_doctype_template">
    <span class="sender-user" data-user="${this.profile.user_email}"></span><span> added ${documents} </span>
    </div>`;

    const message_info = {
      content: mention_msg_info,
      user: this.profile.user,
      room: chat_channel,
      email: this.profile.user_email,
      message_type: "information",
      send_date: get_time(frappe.datetime.now_time(), this.profile.time_zone),
      message_template_type: "Add Doctype",
      sub_channel: this.last_active_sub_channel,
      chat_topic: this.chat_topic,
    };

    await send_message(message_info);
  }

  set_online() {
    if (this.profile.room_type == "Direct") {
      this.$chat_space.find(".chat-profile-status").text("online");
      if (this.online_timeout) {
        clearTimeout(this.online_timeout);
        this.online_timeout = null;
      }
      this.online_timeout = setTimeout(async () => {
        const last_active_value = await get_last_active(
          this.profile.contact,
          this.profile.user_email
        );
        if (last_active_value) {
          const last_active =
            get_date_from_now(
              last_active_value,
              "space",
              this.profile.time_zone
            ) +
            " " +
            get_time(last_active_value, this.profile.time_zone);
          this.$chat_space.find(".chat-profile-status").text(last_active);
        }
      }, 60000);
    } else {
      this.$chat_space.find(".chat-profile-status").text("");
    }
  }

  render_reactions($container, reactions) {
    if (!$container) return;
    $container.empty();
    if (!reactions || reactions.length === 0) return;

    reactions.forEach(react => {
      const is_active = react.users.includes(this.profile.user_email);
      const usernames = react.users.join(", ");
      const $badge = $(`
        <span class="cc-reaction-badge ${is_active ? 'active' : ''}" 
              data-emoji="${react.emoji}" 
              title="${usernames}">
          <span class="cc-rb-emoji">${renderEmoji(react.emoji)}</span>
          <span class="cc-rb-count">${react.count}</span>
        </span>
      `);
      $container.append($badge);
    });
  }

  update_message_reactions(message_name, reactions) {
    const $reaction_bar = this.$chat_space.find(`.cc-reaction-bar[data-message="${message_name}"]`);
    if ($reaction_bar.length > 0) {
      this.render_reactions($reaction_bar, reactions);
    }
  }
} //End class ChatSpace

async function get_messages(
  room,
  user_email,
  room_type,
  chat_topic_space,
  remove_date,
  limit,
  offset
) {
  const res = await frappe.call({
    method: "clefincode_chat.api.api_1_2_1.api.get_messages",
    args: {
      room: room,
      user_email: user_email,
      chat_topic: chat_topic_space,
      remove_date: remove_date,
      room_type: room_type,
      limit: limit,
      offset: offset,
    },
  });
  return await res.message;
}

async function get_contributors(room) {
  const res = await frappe.call({
    type: "GET",
    method: "clefincode_chat.api.api_1_2_1.api.get_contributors",
    args: {
      room: room,
    },
  });
  return await res.message.results[0].contributors;
}

async function get_sub_channel_members(room, user_email) {
  const res = await frappe.call({
    type: "GET",
    method: "clefincode_chat.api.api_1_2_1.api.get_sub_channel_members",
    args: {
      room: room,
      user_email: user_email,
    },
  });
  return await res.message.results[0].contributors;
}

async function get_last_active_sub_channel(room) {
  const res = await frappe.call({
    type: "GET",
    method: "clefincode_chat.api.api_1_2_1.api.get_last_active_sub_channel",
    args: {
      room: room,
    },
  });
  return await res.message.results[0].last_active_sub_channel;
}

async function get_all_sub_channels_for_contributor(
  parent_channel,
  user_email
) {
  const res = await frappe.call({
    type: "GET",
    method:
      "clefincode_chat.api.api_1_2_1.api.get_all_sub_channels_for_contributor",
    args: {
      parent_channel: parent_channel,
      user_email: user_email,
    },
  });
  return await res.message.results;
}

async function update_sub_channel_for_last_message(
  user,
  user_email,
  mentioned_users_emails,
  last_chat_space_message,
  last_active_sub_channel,
  content,
  chat_room,
  old_sub_channel
) {
  const res = frappe.call({
    type: "POST",
    method:
      "clefincode_chat.api.api_1_2_1.api.update_sub_channel_for_last_message",
    args: {
      user: user,
      user_email: user_email,
      mentioned_users_emails: mentioned_users_emails,
      last_chat_space_message: last_chat_space_message,
      last_active_sub_channel: last_active_sub_channel,
      content: content,
      chat_room: chat_room,
      old_sub_channel: old_sub_channel,
    },
  });
  return res.message;
}

async function get_last_active(contact_email, user_email) {
  const last_active = await frappe.call({
    method: "clefincode_chat.api.api_1_2_1.api.get_last_active",
    args: {
      contact_email: contact_email,
      user_email: user_email,
    },
  });
  return await last_active.message.results[0].last_active;
}

async function add_reference_doctype(
  mention_doctypes,
  chat_topic,
  last_active_sub_channel
) {
  const res = await frappe.call({
    method: "clefincode_chat.api.api_1_2_1.api.add_reference_doctype",
    args: {
      mention_doctypes: mention_doctypes,
      chat_topic: chat_topic,
      last_active_sub_channel: last_active_sub_channel,
    },
  });
  return await res.message;
}

async function get_topic_info(chat_channel) {
  const res = await frappe.call({
    method: "clefincode_chat.api.api_1_2_1.api.get_topic_info",
    args: {
      chat_channel: chat_channel,
    },
  });
  return await res.message.results;
}

async function create_chat_topic(
  mention_doctypes,
  chat_channel,
  last_active_sub_channel
) {
  const res = await frappe.call({
    method: "clefincode_chat.api.api_1_2_1.api.create_chat_topic",
    args: {
      mention_doctypes: mention_doctypes,
      chat_channel: chat_channel,
      last_active_sub_channel: last_active_sub_channel,
    },
  });
  return await res.message.results;
}

export async function remove_chat_topic(
  chat_topic,
  chat_channel,
  last_active_sub_channel
) {
  const res = await frappe.call({
    method: "clefincode_chat.api.api_1_2_1.api.remove_chat_topic",
    args: {
      chat_topic: chat_topic,
      chat_channel: chat_channel,
      last_active_sub_channel: last_active_sub_channel,
    },
  });
  return await res.message.results;
}

async function check_if_user_has_permission(
  user_email,
  chat_topic_space,
  chat_topic_channel
) {
  const res = await frappe.call({
    method: "clefincode_chat.api.api_1_2_1.api.check_if_user_has_permission",
    args: {
      user_email: user_email,
      chat_topic: chat_topic_space,
      chat_channel: chat_topic_channel,
    },
  });
  return await res.message;
}

async function check_if_user_send_request(user_email, chat_topic_space) {
  const res = await frappe.call({
    method: "clefincode_chat.api.api_1_2_1.api.check_if_user_send_request",
    args: {
      user_email: user_email,
      chat_topic: chat_topic_space,
    },
  });
  return await res.message;
}

async function send_topic_access_request(
  user_email,
  chat_topic_space,
  chat_topic_channel,
  chat_topic_space_subject,
  reference_doctype,
  reference_docname
) {
  const res = await frappe.call({
    method: "clefincode_chat.api.api_1_2_1.api.send_topic_access_request",

    args: {
      user_email: user_email,
      chat_topic: chat_topic_space,
      chat_channel: chat_topic_channel,
      chat_topic_subject: chat_topic_space_subject,
      reference_doctype: reference_doctype,
      reference_docname: reference_docname,
    },
  });
  return await res.message;
}

async function create_website_support_group(website_user_email, content) {
  const res = await frappe.call({
    method:
      "clefincode_chat.api.api_1_0_1.chat_portal.create_website_support_group",
    args: {
      website_user_email: website_user_email,
      content: content
    },
  });
  return await res.message.results[0];
}

async function check_reference_doctype_empty(docname,template_type) {
  const res = await frappe.call({
    method: "clefincode_chat.api.api_1_3_1.api.is_reference_doctype_Template_empty",
    args: { docname,template_type },
  });
  
  return res.message; // { empty: true/false, value: "DocType" }
}

function show_doctype_selector(doctype, callback) {
  const d = new frappe.ui.Dialog({
    title: `Select ${doctype}`,
    fields: [
      {
        fieldname: "docname",
        label: `Select ${doctype}`,
        fieldtype: "Link",
        options: doctype,
        reqd: 1
      }
    ],
    primary_action_label: "Select",
    primary_action(values) {
      d.hide();
      callback(values.docname);
    }
  });

  d.show();
}
