import { ChatBubble, ChatPortalSpace, ChatList, ChatSpace } from "./components";

frappe.provide("frappe.ErpnextChat");
frappe.provide("frappe.ErpnextChat.settings");
frappe.provide("frappe.ClefinCodeChat");
frappe.ClefinCodeChat.ChatList = ChatList;
frappe.ClefinCodeChat.ChatSpace = ChatSpace;

frappe.ErpnextChat = class {
  constructor() {
    this.setup_app();
  }

  async setup_app() {
    const token = localStorage.getItem("guest_token") || "";
    const res = await get_settings(token);
    this.res = res;
    this.is_desk = "desk" in frappe;

    if (res.user == "Administrator") return;

    if (res.user == "Guest") {
      if (!res.enable_portal_support) return;
      await this.create_chatbot();

      frappe.socketio.init(res.socketio_port);
      this.setup_socketio_mobile();
      if (this.res.channel) {
        const calculate_unread_messages_guest =
          await calculate_unread_messages_forGuest(this.res.channel);

        if (calculate_unread_messages_guest.unread_messages > 0) {
          $("#chat-notification-count").text(
            calculate_unread_messages_guest.unread_messages
          );
        }
      }
    } else {
      await this.create_app();
    }

    frappe.socketio.init(res.socketio_port);

    if (this.res.is_admin) {
      frappe.ErpnextChat.settings = {};
      frappe.ErpnextChat.settings.unread_count = 0;
      frappe.ErpnextChat.settings.unread_rooms = [];
      frappe.ErpnextChat.settings.open_chat_space_rooms = [];

      const calculate_unread_messages_per_rooms =
        await calculate_unread_messages(this.res.user_email);
      frappe.ErpnextChat.settings.unread_count =
        calculate_unread_messages_per_rooms.unread_messages;
      frappe.ErpnextChat.settings.unread_rooms =
        calculate_unread_messages_per_rooms.unread_rooms;
      if (frappe.ErpnextChat.settings.unread_count > 0) {
        $("#chat-notification-count").text(
          frappe.ErpnextChat.settings.unread_count
        );
      } else {
        $("#chat-notification-count").text("");
      }
      this.setup_socketio();
      this.setup_socketio_mobile();
    } else if (res.is_verified) {
      this.chatbot_space = new ChatPortalSpace({
        $wrapper: this.$chat_container,
        chat_bubble: this.chat_bubble,
        profile: {
          is_verified: 1,
          token: token,
          user: res.user,
          user_email: res.user_email,
          room: res.channel,
          chat_support_title: res.chat_support_title,
        },
      });
      this.chatbot_space.render();
    } else {
      this.chatbot_space = new ChatPortalSpace({
        $wrapper: this.$chat_container,
        chat_bubble: this.chat_bubble,
        profile: {
          is_verified: 0,
          token: token,
          user: res.user,
          user_email: res.user_email,
          // chat_support_title: res.chat_support_title,
          // welcome_message: res.welcome_message,
        },
      });
      this.chatbot_space.render();
    }
  }

  async create_app() {
    this.$app_element = $(document.createElement("div")).addClass("chat-app");

    this.$chat_right_section = $(document.createElement("div")).addClass(
      "chat_right_section"
    );

    this.$chat_left_section = $(document.createElement("div"))
      .addClass("chat_left_section")
      .hide();

    this.$app_element.append(this.$chat_right_section);
    this.$app_element.append(this.$chat_left_section);
    this.$chat_bottom = $(document.createElement("div")).addClass(
      "chat_bottom"
    );
    this.$app_element.append(this.$chat_bottom);
    this.$app_element.append(`
    <script>
    const me = this;
    var expand_me =function(parameter,attr,room_type, room, parent_channel, chat_topic) {
        if(attr=='data-room'){
            const chat_list_obj = erpnext_chat_app.chat_list
            if(chat_list_obj){
                const chat_room_item = chat_list_obj.chat_room_groups.find((element) => { return element[0] === parameter; });
                if(chat_room_item){
                    chat_room_item[1].expand = 1;            
                    chat_room_item[1].$chat_room.click();
                }
            }else{
                if(room_type == 'Contributor'){
                    frappe.call({
                        method:
                          "clefincode_chat.api.api_1_2_1.api.mark_messsages_as_read",
                        args: {
                          user: me.frappe.session.user ,
                          channel: null,
                          parent_channel: parent_channel
                        }
                      });

                    frappe.ErpnextChat.settings.unread_rooms = frappe.ErpnextChat.settings.unread_rooms.filter(item => item != parent_channel);
                    frappe.ErpnextChat.settings.open_chat_space_rooms.push(parent_channel)
                  } else{
                    frappe.call({
                        method:
                          "clefincode_chat.api.api_1_2_1.api.mark_messsages_as_read",
                        args: {
                          user: me.frappe.session.user ,
                          channel: room,
                        }
                      });
                    frappe.ErpnextChat.settings.unread_rooms = frappe.ErpnextChat.settings.unread_rooms.filter(item => item != room);
                    frappe.ErpnextChat.settings.open_chat_space_rooms.push(room)
                  }
              
                  frappe.ErpnextChat.settings.unread_count -= 1;
                  if(frappe.ErpnextChat.settings.unread_count <= 0){
                    $('#chat-notification-count').text('');
                  }else{
                    $('#chat-notification-count').text(frappe.ErpnextChat.settings.unread_count);
                }
            }  
            $(".chat-window[data-room|='"+parameter+"']").css("display", "block");
            $(".minimized-chat[data-id|='"+parameter+"']").remove();
        }else if(attr=='data-topic'){
            $(".chat-window[data-topic|='"+parameter+"']").css("display", "block");
            $(".minimized-chat[data-id|='"+parameter+"']").remove();
        }
        else{
          $(".chat-window[data-contact|='"+parameter+"']").css("display", "block");
          $(".minimized-chat[data-id|='"+parameter+"']").remove();
        }
        var screen_width = $("body").outerWidth()
        var right_width = $(".chat_right_section").outerWidth()
        var left_width = $(".chat_left_section").outerWidth()
        if((right_width+left_width)>screen_width){
          $( ".chat-window" ).each(function(index) {
            if(attr=='data-room'){
                
                if ($(this).is("[data-room~='"+parameter+"']")){}
                else{
                    if($(this).css('display') == 'none'){
        
                    }
                    else{
                    $(".collapse-chat-window")[index].click();
                    return false;
                    }
                }
            }else if(attr=='data-topic'){
                $(".collapse-chat-window")[index].click();
                return false;
            }else{
            
                if ($(this).is("[data-contact~='"+parameter+"']")){}
                else{
                    if($(this).css('display') == 'none'){}
                    else{
                        $(".collapse-chat-window")[index].click();
                        return false;
                    }
                }
            }

          });
        }
      }
    
      var closeMe = function(parameter,attr) {

        if(attr=='data-room'){
          $(".chat-window[data-room|='"+parameter+"']").remove();
        }else if(attr=='data-topic'){
            $(".chat-window[data-topic|='"+parameter+"']").remove();
        }else{
          $(".chat-window[data-contact|='"+parameter+"']").remove();
        }
        $(".minimized-chat[data-id|='"+parameter+"']").remove();
      }
    </script>`);

    this.$chat_container = $(document.createElement("div")).addClass(
      "chat-container"
    );
    $("body").append(this.$app_element);
    this.is_open = false;

    this.$chat_element = $(document.createElement("div"))
      .addClass("chat-element")
      .hide();

    this.$chat_element.append(
      `<span class="chat-cross-button">${frappe.utils.icon(
        "close",
        "lg"
      )}</span>`
    );
    this.$chat_element.append(this.$chat_container);
    this.$chat_element.appendTo(this.$chat_right_section);

    this.chat_bubble = new ChatBubble(this);
    this.chat_bubble.render();

    if (this.is_desk === true) {
      // Inject the Messages button into the Frappe top navbar.
      // Use event + immediate attempt to handle toolbar timing.
      const navbar_icon_html = `
        <li class='nav-item dropdown-mobile chat-navbar-icon'>
          <a class="btn chat-nav-link" href="#">
            <div class="chat-nav-icon-wrap">
              <img src="/assets/clefincode_chat/icons/clefincode_chat.svg" width="20px" height="20px">
            </div>
          </a>
          <span class="badge" id="chat-notification-count"></span>
        </li>`;

      const inject = () => {
        if ($(".chat-navbar-icon").length) return; // already injected
        const $target = $(".navbar-right");
        if ($target.length) {
          $target.prepend(navbar_icon_html);
          // Bootstrap tooltip — same style as Frappe workspace shortcut hover labels
          $(".chat-navbar-icon").tooltip({
            title: __("Messages"),
            placement: "bottom",
            trigger: "hover",
          });
          this.chat_bubble.$chat_bubble.hide();
        }
      };

      // Try immediately (toolbar may already be ready)
      inject();
      // Also hook the toolbar_setup event for cases where toolbar loads after us
      $(document).on("toolbar_setup", inject);
      // Last-resort fallback after a short delay
      setTimeout(inject, 1000);

      // If nothing was injected, keep bubble + badge as fallback
      if (!$(".chat-navbar-icon").length) {
        $("#chat-bubble").append(
          '<span class="badge" id="chat-notification-count"></span>'
        );
      }
    } else {
      $("#chat-bubble").append(
        '<span class="badge" id="chat-notification-count"></span>'
      );
    }

    this.setup_events();
  }

  async create_chatbot() {
    this.$app_element = $(document.createElement("div")).addClass("chat-app");
    this.$chat_right_section = $(document.createElement("div")).addClass(
      "chat_right_section"
    );

    this.$chat_element = $(document.createElement("div"))
      .addClass("chat-element")
      .hide();
    this.$chat_container = $(document.createElement("div")).addClass(
      "chat-container"
    );
    this.$chat_element.append(this.$chat_container);

    this.$chat_right_section.append(this.$chat_element);
    this.$app_element.append(this.$chat_right_section);
    $("body").append(this.$app_element);

    this.is_open = false;

    this.chat_bubble = new ChatBubble(this);
    this.chat_bubble.render();

    $(".chat-bubble").append(
      '<span class="badge" id="chat-notification-count"></span>'
    );

    this.setup_events();
  }

  async show_chat_widget() {
    this.is_open = true;
    this.$chat_element.fadeIn(250);
    if (
      this.$chat_element.find(".chatbot-container") &&
      this.$chat_element.find(".chatbot-container").length == 1
    ) {
      this.$chat_element.find(".chatbot-container").animate(
        {
          scrollTop: this.$chat_element
            .find(".chatbot-container")
            .prop("scrollHeight"),
        },
        "fast"
      );
    }
    if (this.res.user === "Guest" && !this.res.channel) {
      const updated_res = await get_settings(
        localStorage.getItem("guest_token") || ""
      );
      this.res.channel = updated_res.channel;
    }
    if (!this.res.is_admin && this.res.channel && this.res.user === "Guest") {
      frappe.call({
        method: "clefincode_chat.api.api_1_2_1.api.mark_messsages_as_read_for_guest",
        args: {
          token: localStorage.getItem("guest_token"),
          channel: this.res.channel
          
        },
      });
    }
    if (this.res.is_admin) {
      this.chat_list = new ChatList({
        $wrapper: this.$chat_container,
        user: this.res.user,
        user_email: this.res.user_email,
        is_admin: this.res.is_admin,
        time_zone: this.res.time_zone,
        user_type: this.res.user_type,
        is_limited_user: this.res.is_limited_user,
      });
      this.chat_list.render();
    }
  }

  hide_chat_widget() {
    this.is_open = false;
    this.$chat_element.fadeOut(300);
    if (!this.res.is_admin && this.res.channel && this.res.user === "Guest") {
      frappe.call({
        method: "clefincode_chat.api.api_1_2_1.api.mark_messsages_as_read_for_guest",
        args: {
          token: localStorage.getItem("guest_token"),
          channel: this.res.channel,
        },
      });
    }
    if (this.res.is_admin) {
      this.chat_list.is_open = 0;
      this.chat_list.$chat_list.remove();
      this.chat_list = undefined;
    }
  }

  should_close(e) {
    const chat_app = $(".chat-app");
    const navbar = $(".navbar");
    const modal = $(".modal");
    return (
      !chat_app.is(e.target) &&
      chat_app.has(e.target).length === 0 &&
      !navbar.is(e.target) &&
      navbar.has(e.target).length === 0 &&
      !modal.is(e.target) &&
      modal.has(e.target).length === 0
    );
  }

  setup_events() {
    $(document).on("click", ".chat-nav-link", (e) => {
      e.preventDefault();
      frappe.set_route("clefincode-chat");
    });
    document.addEventListener("click", (e) => {
      const icon = e.target.closest('.desktop-icon[data-id="Messages"]');
      if (icon) {
        e.preventDefault();
        e.stopImmediatePropagation();
        frappe.set_route("clefincode-chat");
      }
    }, true);
  }

  show_messenger_overlay() {
    if ($("#chat-messenger-overlay").length) return;

    if (!this.res || !this.res.is_admin) {
      frappe.msgprint(__("Chat messenger is not available for your account."));
      return;
    }

    const $overlay = $(`
      <div class="chat-messenger-overlay" id="chat-messenger-overlay">
        <div class="chat-messenger-dialog">
          <div class="chat-messenger-dialog-header">
            <div class="chat-messenger-dialog-title">
              <img src="/assets/clefincode_chat/icons/clefincode_chat.svg" width="20" height="20">
              ${__("Messages")}
            </div>
            <button class="chat-messenger-dialog-close" title="${__("Close")}">
              ${frappe.utils.icon("close", "sm")}
            </button>
          </div>
          <div class="chat-messenger-dialog-body chat-messenger-page">
            <div class="chat-messenger-sidebar" id="chat-overlay-sidebar"></div>
            <div class="chat-messenger-content" id="chat-overlay-content">
              <div class="chat-messenger-placeholder">
                <svg class="icon icon-2xl"><use href="#icon-small-message"></use></svg>
                <p>${__("Select a conversation to start chatting")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    $("body").append($overlay);

    $overlay.find(".chat-messenger-dialog-close").on("click", () => {
      this.close_messenger_overlay();
    });

    $overlay.on("click", (e) => {
      if ($(e.target).is("#chat-messenger-overlay")) {
        this.close_messenger_overlay();
      }
    });

    $(document).one("keydown.messenger_overlay", (e) => {
      if (e.key === "Escape") this.close_messenger_overlay();
    });

    const $sidebar = $("#chat-overlay-sidebar");
    const $content = $("#chat-overlay-content");
    let active_chat_space = null;

    const chat_list = new frappe.ClefinCodeChat.ChatList({
      $wrapper: $sidebar,
      user: this.res.user,
      user_email: this.res.user_email,
      is_admin: this.res.is_admin,
      time_zone: this.res.time_zone,
      user_type: this.res.user_type,
      is_limited_user: this.res.is_limited_user,
      on_room_open: (profile, $chat_room, chat_status) => {
        $sidebar.find(".chat-room").removeClass("chat-room-active");
        $chat_room.addClass("chat-room-active");
        $content.empty();
        if (active_chat_space) active_chat_space.is_open = 0;
        active_chat_space = new frappe.ClefinCodeChat.ChatSpace({
          $wrapper: $content,
          profile: profile,
          $chat_room: $chat_room,
          chat_status: chat_status,
        });
      },
    });
    chat_list.render();
  }

  close_messenger_overlay() {
    $(document).off("keydown.messenger_overlay");
    $("#chat-messenger-overlay").remove();
  }

  setup_socketio() {
    const updateUnreadCount = () => {
      frappe.ErpnextChat.settings.unread_count += 1;
      $("#chat-notification-count").text(
        frappe.ErpnextChat.settings.unread_count
      );
    };

    const addUnreadRoom = (room) => {
      if (!frappe.ErpnextChat.settings.unread_rooms.includes(room)) {
        frappe.ErpnextChat.settings.unread_rooms.push(room);
      }
    };

    const playChatNotificationSound = () => {
      // this statment don't work on portal
      // frappe.utils.play_sound("chat-notification");

      // Alternative way for playing the notification sound.
      const audio = new Audio(
        "/assets/clefincode_chat/sounds/new-chat-notification.mp3"
      );
      audio.play().catch((error) => {
        console.error("Error playing sound:", error);
      });
    };

    frappe.realtime.on("new_chat_notification", function (res) {
      if (res.sender_email === frappe.session.user) {
        return;
      }

      const isContributor = res.room_type === "Contributor";
      const channel = isContributor ? res.parent_channel : res.room;
      if (
        !frappe.ErpnextChat.settings.open_chat_space_rooms.includes(channel) &&
        $(".chat-navbar-icon") &&
        $(".chat-navbar-icon").css("display") != "none"
      ) {
        playChatNotificationSound();
        if (!frappe.ErpnextChat.settings.unread_rooms.includes(channel)) {
          updateUnreadCount();
          addUnreadRoom(channel);
        }
      }
    });
  }

  setup_socketio_mobile() {
    frappe.realtime.on("receive_message", function (res) {
      var obj = [{ key: "receive_message", data: [JSON.stringify(res)] }];
    });
    frappe.realtime.on("guest_unread_update", async () => {
      if (!this.is_open) {
        // Play notification sound
        const audio = new Audio(
          "/assets/clefincode_chat/sounds/new-chat-notification.mp3"
        );
        audio.play().catch((error) => {
          console.error("Error playing sound:", error);
        });

        // Make sure badge container exists (if needed)
        if ($("#chat-notification-count").length === 0) {
          $(".chat-bubble").append(
            '<span class="badge" id="chat-notification-count"></span>'
          );
        }

        // Only for guest users, calculate live unread count
        if (this.res.user === "Guest") {
          try {
            if (!this.res.channel) {
              const token = localStorage.getItem("guest_token") || "";
              const res = await get_settings(token);
              this.res = res;
            }

            if (this.res.channel) {
              const result = await calculate_unread_messages_forGuest(
                this.res.channel
              );
              $("#chat-notification-count").text(result.unread_messages || "");
            } else {
              console.warn(
                "No channel found for guest after re-fetching settings."
              );
            }
          } catch (error) {
            console.error("Error calculating guest unread messages:", error);
          }
        }
      }
    });

    // This is a way to print data on browser console (only for testing)
    
  }
}; //End ErpnextChat Class

async function get_settings(token) {
  const res = await frappe.call({
    type: "GET",
    method: "clefincode_chat.api.api_1_2_1.api.get_settings",
    args: {
      token: token,
    },
  });
  return await res.message;
}

async function calculate_unread_messages(user) {
  const res = await frappe.call({
    type: "GET",
    method: "clefincode_chat.api.api_1_2_1.api.calculate_unread_messages",
    args: {
      user: user,
    },
  });
  return await res.message;
}
async function calculate_unread_messages_forGuest(channel) {
  const res = await frappe.call({
    type: "GET",
    method:
      "clefincode_chat.api.api_1_2_1.api.calculate_unread_messages_for_guest",
    args: {
      channel: channel,
      token: localStorage.getItem("guest_token") || ""
    },
  });
  return await res.message;
}

$(function () {
  window.erpnext_chat_app = new frappe.ErpnextChat();
});
