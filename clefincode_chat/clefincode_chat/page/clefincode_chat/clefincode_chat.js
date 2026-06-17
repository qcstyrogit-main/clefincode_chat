frappe.pages["clefincode-chat"].on_page_load = async function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Chat"),
		single_column: true,
	});

	// Ensure global settings object exists (may already be set by the floating widget)
	frappe.ErpnextChat = frappe.ErpnextChat || {};
	frappe.ErpnextChat.settings = frappe.ErpnextChat.settings || {
		unread_count: 0,
		unread_rooms: [],
		open_chat_space_rooms: [],
	};

	// Wait for the main chat app to finish initialising (it runs on DOMContentLoaded)
	let app = window.erpnext_chat_app;
	for (let i = 0; i < 20 && (!app || !app.res); i++) {
		await new Promise((resolve) => setTimeout(resolve, 300));
		app = window.erpnext_chat_app;
	}

	const $main = $(wrapper).find(".layout-main-section");

	if (!app || !app.res || !app.res.is_admin) {
		$main.html(
			`<div class="chat-messenger-unavailable">
				<svg class="icon icon-xl"><use href="#icon-small-message"></use></svg>
				<p>${__("Chat is not available for your account.")}</p>
			</div>`
		);
		return;
	}

	window.clefincode_messenger_page = new ClefinCodeMessengerPage(wrapper, app.res);
	window.clefincode_messenger_page.render();
};

frappe.pages["clefincode-chat"].on_page_show = function (wrapper) {
	// Re-highlight the active room when navigating back to the page
	const page = window.clefincode_messenger_page;
	if (page && page.active_room) {
		page.$sidebar
			.find(`.chat-room[data-room="${page.active_room}"]`)
			.addClass("chat-room-active");
	}
};

class ClefinCodeMessengerPage {
	constructor(wrapper, settings) {
		this.wrapper = wrapper;
		this.settings = settings;
		this.active_room = null;
		this.active_chat_space = null;
		this.$sidebar = null;
		this.$content = null;
	}

	render() {
		const $main = $(this.wrapper).find(".layout-main-section");
		$main.addClass("chat-messenger-page").empty();

		this.$sidebar = $('<div class="chat-messenger-sidebar"></div>');
		this.$content = $('<div class="chat-messenger-content"></div>');

		this.$content.html(`
			<div class="chat-messenger-placeholder">
				<svg class="icon icon-2xl"><use href="#icon-small-message"></use></svg>
				<p>${__("Select a conversation to start chatting")}</p>
			</div>
		`);

		$main.append(this.$sidebar).append(this.$content);

		this.chat_list = new frappe.ClefinCodeChat.ChatList({
			$wrapper: this.$sidebar,
			user: this.settings.user,
			user_email: this.settings.user_email,
			is_admin: this.settings.is_admin,
			time_zone: this.settings.time_zone,
			user_type: this.settings.user_type,
			is_limited_user: this.settings.is_limited_user,
			on_room_open: (profile, $chat_room, chat_status) => {
				this.open_room(profile, $chat_room, chat_status);
			},
		});
		this.chat_list.render();
	}

	open_room(profile, $chat_room, chat_status) {
		// Highlight the selected room
		this.$sidebar.find(".chat-room").removeClass("chat-room-active");
		if ($chat_room) $chat_room.addClass("chat-room-active");

		this.active_room = profile.room;
		this.$content.empty();

		if (this.active_chat_space) {
			this.active_chat_space.is_open = 0;
		}

		this.active_chat_space = new frappe.ClefinCodeChat.ChatSpace({
			$wrapper: this.$content,
			profile: profile,
			$chat_room: $chat_room,
			chat_status: chat_status,
		});
	}

	open_contact_chat(profile, chat_status) {
		let $chat_room = null;
		if (profile.room) {
			const $found = this.$sidebar.find(`.chat-room[data-room="${profile.room}"]`);
			if ($found.length) $chat_room = $found;
		}
		this.open_room(profile, $chat_room, chat_status);
	}
}
