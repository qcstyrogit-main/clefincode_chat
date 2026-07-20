# Copyright (c) 2025, ClefinCode L.L.C-FZ and Contributors
# See license.txt

# import frappe
from types import SimpleNamespace
from unittest.mock import Mock

from frappe.tests.utils import FrappeTestCase
from clefincode_chat.utils import whatsapp_notification


class FakeCache:
	def __init__(self):
		self.values = {}
		self.set_calls = []
		self.delete_calls = []

	def get_value(self, key):
		return self.values.get(key)

	def set_value(self, key, value, expires_in_sec=None):
		self.values[key] = value
		self.set_calls.append((key, value, expires_in_sec))

	def delete_value(self, key):
		self.values.pop(key, None)
		self.delete_calls.append(key)


class TestClefincodeNotification(FrappeTestCase):
	def test_get_notifications_map_reuses_cached_value(self):
		cache = FakeCache()
		cached_map = {"Sales Order": {"Submit": ["Cached Notification"]}}
		cache.values[whatsapp_notification.WHATSAPP_NOTIFICATION_MAP_CACHE_KEY] = cached_map

		fake_frappe = SimpleNamespace(
			cache=lambda: cache,
			flags=SimpleNamespace(in_patch=False),
			db=SimpleNamespace(table_exists=Mock()),
			get_all=Mock(return_value=[]),
		)

		original_frappe = whatsapp_notification.frappe
		whatsapp_notification.frappe = fake_frappe
		try:
			self.assertEqual(whatsapp_notification.get_notifications_map(), cached_map)
			fake_frappe.get_all.assert_not_called()
		finally:
			whatsapp_notification.frappe = original_frappe

	def test_get_notifications_map_caches_rebuilt_value_with_ttl(self):
		cache = FakeCache()
		notification = SimpleNamespace(
			name="Submit Notification",
			reference_doctype="Sales Order",
			doctype_event="Submit",
			notification_type="DocType Event",
		)
		fake_frappe = SimpleNamespace(
			cache=lambda: cache,
			flags=SimpleNamespace(in_patch=False),
			db=SimpleNamespace(table_exists=Mock()),
			get_all=Mock(return_value=[notification]),
		)

		original_frappe = whatsapp_notification.frappe
		whatsapp_notification.frappe = fake_frappe
		try:
			self.assertEqual(
				whatsapp_notification.get_notifications_map(),
				{"Sales Order": {"Submit": ["Submit Notification"]}},
			)
			self.assertEqual(
				cache.set_calls,
				[
					(
						whatsapp_notification.WHATSAPP_NOTIFICATION_MAP_CACHE_KEY,
						{"Sales Order": {"Submit": ["Submit Notification"]}},
						whatsapp_notification.WHATSAPP_NOTIFICATION_MAP_CACHE_TTL,
					)
				],
			)
		finally:
			whatsapp_notification.frappe = original_frappe

	def test_ensure_patch_is_idempotent(self):
		cache = FakeCache()
		cache.values[whatsapp_notification.WHATSAPP_NOTIFICATION_MAP_CACHE_KEY] = {}
		original_set_value = Mock(return_value="updated")
		fake_db = SimpleNamespace(set_value=original_set_value)
		fake_frappe = SimpleNamespace(cache=lambda: cache, db=fake_db)

		original_frappe = whatsapp_notification.frappe
		original_module_set_value = whatsapp_notification._ORIGINAL_DB_SET_VALUE
		original_patchexecuted = whatsapp_notification._patchexecuted
		whatsapp_notification.frappe = fake_frappe
		whatsapp_notification._ORIGINAL_DB_SET_VALUE = original_set_value
		whatsapp_notification._patchexecuted = False
		try:
			whatsapp_notification._ensure_patch()
			first_wrapper = fake_db.set_value

			whatsapp_notification._ensure_patch()
			whatsapp_notification._patchexecuted = False
			whatsapp_notification._ensure_patch()

			self.assertIs(fake_db.set_value, first_wrapper)
			self.assertTrue(
				getattr(fake_db.set_value, whatsapp_notification.WRAPPED_SET_VALUE_MARKER)
			)
			self.assertIs(
				getattr(fake_db.set_value, whatsapp_notification.ORIGINAL_SET_VALUE_ATTR),
				original_set_value,
			)
			self.assertEqual(
				fake_db.set_value("Workstation", "WS-001", "status", "Busy"),
				"updated",
			)
			original_set_value.assert_called_once_with(
				"Workstation", "WS-001", "status", "Busy"
			)
		finally:
			whatsapp_notification.frappe = original_frappe
			whatsapp_notification._ORIGINAL_DB_SET_VALUE = original_module_set_value
			whatsapp_notification._patchexecuted = original_patchexecuted
