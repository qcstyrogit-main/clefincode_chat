import frappe
import requests

def create_messages_desktop_icon():
    try:
        if frappe.db.exists("Desktop Icon", "Messages"):
            return
        doc = frappe.get_doc({
            "doctype": "Desktop Icon",
            "name": "Messages",
            "label": "Messages",
            "app": "clefincode_chat",
            "standard": 1,
            "hidden": 0,
            "restrict_removal": 0,
            "bg_color": "gray",
            "logo_url": "/assets/clefincode_chat/icons/clefincode_chat.svg",
            "icon_type": "App",
            "link_type": "External",
            "link": "#clefincode-chat",
            "idx": 0,
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print("Messages Desktop Icon created.")
    except Exception as e:
        print(f"Could not create Messages Desktop Icon: {e}")

def after_migrate():
    try:
        print("Requesting Firebase Server Key ...")
        response = requests.get("https://clefincode.com/api/method/clefincode_support.api.mobile_notifications.request_firebase_server_key")
        
        if response.status_code == 200:
            data = response.json()
            firebase_server_key = data.get('message', {}).get('firebase_server_key')
            
            if firebase_server_key:
                doc = frappe.get_doc('ClefinCode Chat Settings')
                doc.firebase_server_key = firebase_server_key
                doc.save(ignore_permissions = True)
                frappe.db.commit()
                print("Firebase Server Key updated in ClefinCode Chat Settings")
            else:
                print("Server key not found in response.")
        else:
            print(f"Failed to get data: {response.status_code}")
    except Exception as e:
        print(f"An error occurred: {e}")

    create_messages_desktop_icon()