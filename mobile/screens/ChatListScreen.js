import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { theme } from '../theme';
import { getChannels } from '../services/api';

// Helper to strip HTML tags for the preview text
const stripHtml = (html) => {
  if (!html) return "";
  // First, handle the special reply quote structure
  if (html.includes('cc-inline-reply-text')) {
    const parts = html.split('cc-inline-reply-text">');
    if (parts.length > 1) {
      // Extract the text after the reply quote
      const textPart = parts[1].split('</div>')[0];
      const remaining = html.split('</div></div>')[1] || "";
      return (textPart + " " + remaining).replace(/<[^>]*>?/gm, '').trim();
    }
  }
  return html.replace(/<[^>]*>?/gm, '').trim();
};

const ChatListItem = ({ chat, onPress }) => {
  const lastMsg = stripHtml(chat.last_message) || "No messages yet";
  const senderName = chat.room_name || chat.name || "Unknown";
  
  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress}>
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
          <Text style={styles.avatarText}>{senderName[0]?.toUpperCase()}</Text>
        </View>
        {chat.online && <View style={styles.onlineBadge} />}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>{senderName}</Text>
          <Text style={styles.chatTime}>{chat.last_message_time || ""}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>{lastMsg}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ChatListScreen({ route, navigation }) {
  const { user_email } = route.params;
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = async () => {
    try {
      const rooms = await getChannels(user_email);
      setChannels(rooms || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>
      <FlatList
        data={channels}
        keyExtractor={(item, index) => item.room || index.toString()}
        renderItem={({ item }) => (
          <ChatListItem 
            chat={item} 
            onPress={() => navigation.navigate('ChatRoom', { chat: item, user_email })} 
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  chatItem: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  avatarText: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  onlineBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.online,
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  chatInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  chatTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  lastMessage: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    padding: 100,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
  }
});
