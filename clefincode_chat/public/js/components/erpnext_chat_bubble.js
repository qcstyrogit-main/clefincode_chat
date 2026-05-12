export default class ChatBubble {
  // the parent is the app object
  constructor(parent) {
    this.parent = parent;
    this.setup();
  }

  setup() {
    this.$chat_bubble = $(document.createElement("div"));
    let chat_icon = `<img title="Start Chat" src="/assets/clefincode_chat/icons/clefincode_chat.svg" width="32px" height="32px">`;
    this.open_title = this.parent.is_admin ? __("Show Chats") : chat_icon;
    this.closed_title = __("Close Chat");

    this.open_inner_html = `
              <div class='p-2 chat-bubble'>
                  <div>${this.open_title}</div>
              </div>
          `;
    this.closed_inner_html = `
          <div class='chat-bubble-closed chat-bubble'>
              <span class='cross-icon'>
              <img title="Start Chat" src="/assets/clefincode_chat/icons/close.svg"  width="25px" height="25px">
              </span>
          </div>
          `;
    this.$chat_bubble
      .attr({
        title: "Start Chat",
        id: "chat-bubble",
      })
      .html(this.open_inner_html);
  }

  render() {
    this.parent.$chat_right_section.append(this.$chat_bubble);
    // On desk the navbar Messages button is used — hide the floating bubble
    if (this.parent.is_desk) {
      this.$chat_bubble.hide();
    }
    this.setup_events();
  }

  disk_chat_icon(){
    if (this.parent.is_open) {
      this.parent.hide_chat_widget();
    } else {
      this.parent.show_chat_widget();
    }
  }

  portal_chat_icon() { 
    if(this.parent.res.user_type != "guest" && this.parent.is_open){
      return
    } 

    this.parent.is_open = !this.parent.is_open;
    if (this.parent.res.user_type == "guest") {
      if (this.parent.is_open === false) {
        this.$chat_bubble
          .attr({ title: this.open_title })
          .html(this.open_inner_html);
        this.parent.hide_chat_widget();
      } else {
        this.$chat_bubble
          .attr({ title: this.closed_title })
          .html(this.closed_inner_html);
        this.parent.show_chat_widget();
      }
    }else{
      this.parent.show_chat_widget();
    }
   
  }

  setup_events() {
    const me = this;
    if (this.parent.is_desk) {
      $("#chat-bubble").on("click", () => {
        me.disk_chat_icon();
      });
    } else {
      $("#chat-bubble, .chat-cross-button").on("click", () => {
        me.portal_chat_icon();
      });
    }
  }
}
