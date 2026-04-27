import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, useWindowDimensions, Modal, Image, ScrollView, Alert } from 'react-native';
import { theme } from '../theme';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { getMessages, sendMessage, frappeCall, getBaseUrl } from '../services/api';
import { initSocket, getSocket } from '../services/socket';
import RenderHTML from 'react-native-render-html';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';

const QUICK_REACTIONS = ['👍', '❤️', '😆', '😮', '😢', '😡'];
const EMOJI_CATEGORIES = [
  { name: 'Recent', icon: 'time-outline', emojis: ['👍', '❤️', '😆', '😮', '😢', '😡', '🔥', '✨', '🙌', '💯', '😂', '🤣', '😊', '😍'] },
  { name: 'Smileys', icon: 'happy-outline', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'] },
  { name: 'People', icon: 'people-outline', emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾'] },
  { name: 'Nature', icon: 'leaf-outline', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇'] },
  { name: 'Food', icon: 'fast-food-outline', emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🍔', '🍟', '🍕', '🥪'] },
  { name: 'Activities', icon: 'basketball-outline', emojis: ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏'] },
  { name: 'Travel', icon: 'airplane-outline', emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛵', '🚲', '🛴', '🛹'] },
  { name: 'Objects', icon: 'bulb-outline', emojis: ['⌚️', '📱', '📲', '💻', '⌨️', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', '📀', '📼', '📷', '📸'] },
  { name: 'Symbols', icon: 'heart-outline', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'] },
  { name: 'Flags', icon: 'flag-outline', emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🇵🇭', '🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇯🇵', '🇰🇷'] }
];

const TAGS_STYLES = {
  div: { color: 'inherit' },
};

const MessageBubble = React.memo(({ message, isMe, onLongPress, baseUrl, user_email, chat }) => {
  const { width } = useWindowDimensions();
  let r_user = message.replied_message_sender;
  let r_text = message.replied_message_content;
  const quoteRegex = /<div class="cc-inline-reply-quote"[^>]*>.*?<\/div><\/div>/s;
  const mainContent = (message.content || "").replace(quoteRegex, '').trim();

  if (!r_user) {
    const userMatch = (message.content || "").match(/<div class="cc-inline-reply-user">(.*?)<\/div>/);
    const textMatch = (message.content || "").match(/<div class="cc-inline-reply-text">(.*?)<\/div>/);
    if (userMatch) r_user = userMatch[1];
    if (textMatch) r_text = textMatch[1];
  }

  const hasReply = !!r_user;
  return (
    <View style={[styles.bubbleContainer, isMe ? styles.myBubbleContainer : styles.theirBubbleContainer]}>
      {!isMe && (
        <View style={styles.avatarContainer}>
          {message.sender_image ? (
            <Image source={{ uri: message.sender_image.startsWith('http') ? message.sender_image : `${baseUrl}${message.sender_image}` }} style={styles.avatarImage} />
          ) : (
            <View style={styles.smallAvatar}>
              <Text style={{fontSize: 10, color: theme.colors.primary}}>{message.sender?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}
        </View>
      )}
      <View style={{maxWidth: '85%'}}>
        {hasReply && (
          <View style={[styles.replyHeader, isMe ? {alignSelf: 'flex-end'} : {alignSelf: 'flex-start'}]}>
            <MaterialIcons name="reply" size={14} color="#999" />
            <Text style={styles.replyHeaderText}>
              {isMe ? 'You' : (message.sender_name || message.sender || 'User')} replied to {(r_user === user_email || (chat && (r_user === chat.current_user_name || r_user === user_email))) ? (isMe ? 'yourself' : 'you') : (r_user || 'them')}
            </Text>
          </View>
        )}
        <TouchableOpacity 
          onLongPress={() => onLongPress(message)}
          activeOpacity={0.8}
          style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble, hasReply ? {paddingTop: 0} : {}]}
        >
          {hasReply && (
            <View style={styles.nestedReplyQuote}>
              <Text style={styles.nestedReplyText} numberOfLines={1}>{r_text}</Text>
            </View>
          )}
          <View style={{padding: hasReply ? 10 : 0}}>
            <RenderHTML
              contentWidth={width * 0.7}
              source={{ html: mainContent || "" }}
              tagsStyles={TAGS_STYLES}
              baseStyle={{ fontSize: 16, color: isMe ? '#fff' : '#000' }}
            />
          </View>
          {message.reactions && message.reactions.length > 0 && (
            <View style={[styles.reactionsWrapper, isMe ? {left: -10} : {right: -10}]}>
              {message.reactions.map((r, i) => (
                <View key={i} style={styles.reactionBadge}>
                  <Text style={{fontSize: 14}}>{r.emoji}</Text>
                  {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.timestamp, isMe ? {textAlign: 'right'} : {textAlign: 'left'}]}>
          {new Date(message.send_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {isMe && message.is_seen ? '· Seen' : ''}
        </Text>
      </View>
    </View>
  );
});

import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Support for defaultProps will be removed']);

export default function ChatRoomScreen({ route, navigation }) {
  const { chat, user_email } = route.params;
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Smileys');
  const [baseUrl, setBaseUrl] = useState('');
  
  const flatListRef = useRef();
  const emojiListRef = useRef();
  const typingTimeoutRef = useRef();

  useEffect(() => {
    let currentSocket = getSocket();
    let onConnect = null;
    const roomName = chat.room || chat.name;

    const setupSocket = async () => {
      let currentSocket = getSocket();
      setSocketStatus('connecting');
      
      if (!currentSocket) {
        currentSocket = await initSocket(user_email);
      }
      
      if (currentSocket && roomName) {
        setSocketStatus(currentSocket.connected ? 'connected' : 'connecting');
        
        currentSocket.on('connect', () => setSocketStatus('connected'));
        currentSocket.on('disconnect', () => setSocketStatus('disconnected'));
        currentSocket.on('connect_error', () => setSocketStatus('disconnected'));

        // Clear any existing listeners
        currentSocket.off(roomName);
        currentSocket.off(`chat_room:${roomName}`);
        currentSocket.off(`chat_room_${roomName}`);
        
        // CRITICAL: Join all possible room formats and commands
        console.log(`📣 JOINING ROOM: ${roomName}`);
        currentSocket.emit('subscribe_room', roomName);
        currentSocket.emit('join_room', roomName);
        currentSocket.emit('subscribe_room', `chat_room:${roomName}`);
        currentSocket.emit('join_room', `chat_room:${roomName}`);
        currentSocket.emit('subscribe_room', `chat_room_${roomName}`);
        currentSocket.emit('join_room', `chat_room_${roomName}`);
        
        // Handle reconnection
        onConnect = () => {
          console.log(`🔄 REJOINING ROOM: ${roomName}`);
          currentSocket.emit('subscribe_room', roomName);
          currentSocket.emit('join_room', roomName);
          fetchHistory();
        };
        currentSocket.on('connect', onConnect);

        const handleData = (data) => {
          console.log("📥 RECEIVED DATA:", data);
          if (data.realtime_type === 'reaction_update') {
            setMessages(prev => prev.map(m => m.message_name === data.message_name ? { ...m, reactions: data.reactions } : m));
          } else if (data.realtime_type === 'typing') {
            if (data.user !== user_email) {
              setTypingUser(data.full_name || data.user);
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
            }
          } else if (data.message_name || data.content) {
            const incomingSender = data.sender_email || data.user || data.sender;
            setMessages(prev => {
              const exists = prev.find(m => m.message_name === data.message_name || (m.message_name?.startsWith('temp-') && m.content === data.content));
              if (exists) {
                return sortMessages(prev.map(m => (m.message_name === exists.message_name) ? { ...data, sender_email: incomingSender } : m));
              }
              return sortMessages([...prev, { ...data, sender_email: incomingSender }]);
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        };

        currentSocket.on(roomName, handleData);
        currentSocket.on(`chat_room:${roomName}`, handleData);
        currentSocket.on(`chat_room_${roomName}`, handleData);
        currentSocket.on(user_email, handleData); // Listen on your email too!
        currentSocket.on('message', handleData);
        currentSocket.on('chat_message', handleData);
        currentSocket.on('new_message', handleData);
      }
    };

    const loadBase = async () => { setBaseUrl(await getBaseUrl()); };
    loadBase();
    fetchHistory();
    setupSocket();
    
    return () => {
      if (currentSocket) {
        currentSocket.off(roomName);
        if (onConnect) currentSocket.off('connect', onConnect);
      }
      clearTimeout(typingTimeoutRef.current);
    };
  }, [chat.room, chat.name, user_email]);

  const sortMessages = (msgs) => {
    return [...msgs].sort((a, b) => {
      const dateA = new Date(a.send_date);
      const dateB = new Date(b.send_date);
      if (dateA - dateB !== 0) return dateA - dateB;
      // If same time, keep temp messages at the end
      if (a.message_name?.startsWith('temp-') && !b.message_name?.startsWith('temp-')) return 1;
      if (!a.message_name?.startsWith('temp-') && b.message_name?.startsWith('temp-')) return -1;
      return 0;
    });
  };

  const fetchHistory = async () => {
    try {
      const history = await getMessages(chat.room || chat.name, user_email);
      if (history) setMessages(sortMessages(history));
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleTyping = () => {
    const s = getSocket();
    if (s) s.emit('frappe_typing', { user: user_email, room: chat.room || chat.name, full_name: user_email });
  };

  const handleSend = async (content = inputText) => {
    if (!content || content.trim().length === 0) return;
    const msgContent = content.trim();
    const replyHtml = replyToMessage 
      ? `<div class="cc-inline-reply-quote" data-target="${replyToMessage.message_name}"><div class="cc-inline-reply-user">${replyToMessage.sender}</div><div class="cc-inline-reply-text">${replyToMessage.content.replace(/<[^>]*>?/gm, '').substring(0, 50)}</div></div>`
      : '';
    const finalContent = `${replyHtml}${msgContent}`;

    const optimisticMessage = {
      message_name: `temp-${Date.now()}`,
      content: finalContent,
      sender: chat.current_user_name,
      sender_name: chat.current_user_name,
      sender_email: user_email,
      send_date: new Date().toISOString(),
      reactions: [],
      replied_message_sender: replyToMessage?.sender,
      replied_message_content: replyToMessage?.content,
      reply_to: replyToMessage?.message_name
    };

    setInputText('');
    setReplyToMessage(null);
    setMessages(prev => sortMessages([...prev, optimisticMessage]));
    
    // Force immediate scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try { 
      await sendMessage(finalContent, chat.room || chat.name, user_email); 
    } catch (e) { 
      setMessages(prev => prev.filter(m => m.message_name !== optimisticMessage.message_name)); 
      Alert.alert("Error", "Message failed to send. Please check your connection.");
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7, base64: true });
    if (!result.canceled) handleSend(`<p><img src="data:image/jpeg;base64,${result.assets[0].base64}" /></p>`);
  };

  const handlePickDocument = async () => {
    setShowActionMenu(false);
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!res.canceled) handleSend(`<p>📎 Attachment: ${res.assets[0].name}</p>`);
  };

  const handleReaction = async (emoji) => {
    if (!selectedMessage) return;
    const msgName = selectedMessage.message_name;
    setShowReactionModal(false);
    setMessages(prev => prev.map(m => {
      if (m.message_name === msgName) {
        let newR = [...(m.reactions || [])];
        const idx = newR.findIndex(r => r.emoji === emoji);
        if (idx > -1) newR[idx].count++; else newR.push({ emoji, count: 1 });
        return { ...m, reactions: newR };
      }
      return m;
    }));
    try {
      const res = await frappeCall('clefincode_chat.api.api_1_2_1.api.toggle_message_reaction', { message_name: msgName, emoji, user_email, room: chat.room || chat.name });
      if (res?.results?.[0]?.reactions) setMessages(prev => prev.map(m => m.message_name === msgName ? { ...m, reactions: res.results[0].reactions } : m));
    } catch (e) { fetchHistory(); }
  };

  const handleCopy = async () => {
    if (!selectedMessage) return;
    const plainText = selectedMessage.content.replace(/<[^>]*>?/gm, '');
    await Clipboard.setStringAsync(plainText);
    setShowReactionModal(false);
    Alert.alert("Copied", "Message copied to clipboard");
  };

  const renderEmojiGrid = () => (
    <View style={{flex: 1}}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Search emoji" value={emojiSearch} onChangeText={setEmojiSearch} />
      </View>
      <ScrollView ref={emojiListRef} style={styles.emojiScroll}>
        {EMOJI_CATEGORIES.map((cat) => {
          const filtered = cat.emojis.filter(e => e.includes(emojiSearch));
          if (filtered.length === 0 && emojiSearch) return null;
          return (
            <View key={cat.name}>
              <Text style={styles.categoryTitle}>{cat.name}</Text>
              <View style={styles.emojiGrid}>
                {filtered.map(e => (
                  <TouchableOpacity key={e} style={styles.emojiItem} onPress={() => { setInputText(prev => prev + e); }}>
                    <Text style={{fontSize: 28}}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.categoryTabs}>
        {EMOJI_CATEGORIES.map(cat => (
          <TouchableOpacity key={cat.name} style={styles.tabIcon} onPress={() => setActiveCategory(cat.name)}>
            <Ionicons name={cat.icon} size={22} color={activeCategory === cat.name ? theme.colors.primary : '#999'} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={30} color={theme.colors.primary} /></TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{chat.room_name || chat.name}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={[styles.statusDot, { backgroundColor: socketStatus === 'connected' ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.headerStatus}>
              {typingUser ? `${typingUser} is typing...` : (socketStatus === 'connected' ? `online (${chat.room || chat.name})` : 'connecting...')}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity><Ionicons name="call" size={22} color={theme.colors.primary} style={{marginRight: 20}} /></TouchableOpacity>
          <TouchableOpacity><Ionicons name="videocam" size={24} color={theme.colors.primary} /></TouchableOpacity>
        </View>
      </View>

      <View style={styles.chatArea}>
        <FlatList 
          ref={flatListRef} 
          data={messages} 
          extraData={messages.length + (typingUser ? 1 : 0)}
          keyExtractor={(item, index) => item.message_name || index.toString()}
          renderItem={({ item }) => {
            const itemSender = item.sender_email || item.user || item.sender;
            const isMe = itemSender === user_email;
            return <MessageBubble message={{...item, sender_email: itemSender}} isMe={isMe} onLongPress={(m) => { setSelectedMessage(m); setShowReactionModal(true); }} baseUrl={baseUrl} user_email={user_email} chat={chat} />;
          }}
          contentContainerStyle={styles.messageList} 
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })} 
        />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {replyToMessage && (
          <View style={styles.replyPreview}>
            <View style={styles.replyBar} />
            <View style={styles.replyContent}>
              <Text style={styles.replyUser}>Replying to {replyToMessage.sender}</Text>
              <Text style={styles.replyText} numberOfLines={1}>{replyToMessage.content.replace(/<[^>]*>?/gm, '')}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyToMessage(null)}><Ionicons name="close-circle" size={20} color="#999" /></TouchableOpacity>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowActionMenu(true)}><Ionicons name="add-circle" size={28} color={theme.colors.primary} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handlePickImage}><Ionicons name="image" size={26} color={theme.colors.primary} /></TouchableOpacity>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.input} placeholder="Type a message..." value={inputText} onChangeText={(t) => { setInputText(t); handleTyping(); }} multiline />
            <TouchableOpacity style={styles.emojiButton} onPress={() => setShowEmojiPicker(!showEmojiPicker)}><Ionicons name="happy-outline" size={24} color={theme.colors.primary} /></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => handleSend()}><Ionicons name={inputText.length > 0 ? "send" : "thumbs-up"} size={26} color={theme.colors.primary} /></TouchableOpacity>
        </View>
        {showEmojiPicker && <View style={styles.emojiPickerContainer}>{renderEmojiGrid()}</View>}
      </KeyboardAvoidingView>

      <Modal visible={showReactionModal} transparent animationType="fade" onRequestClose={() => setShowReactionModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowReactionModal(false)}>
          <View style={styles.reactionMenu}>
            <View style={styles.reactionBar}>
              {QUICK_REACTIONS.map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => handleReaction(emoji)} style={styles.reactionOption}><Text style={{fontSize: 28}}>{emoji}</Text></TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.customizeBtn}><Text style={styles.customizeText}>Customize</Text></TouchableOpacity>
            </View>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.gridAction} onPress={() => { setReplyToMessage(selectedMessage); setShowReactionModal(false); }}>
                <MaterialIcons name="reply" size={24} color="#333" />
                <Text style={styles.gridText}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridAction} onPress={handleCopy}>
                <MaterialIcons name="content-copy" size={22} color="#333" />
                <Text style={styles.gridText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridAction} onPress={() => setShowReactionModal(false)}>
                <Ionicons name="ellipsis-vertical" size={22} color="#333" />
                <Text style={styles.gridText}>More</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showActionMenu} transparent animationType="slide" onRequestClose={() => setShowActionMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowActionMenu(false)}>
          <View style={styles.actionMenu}>
            <TouchableOpacity style={styles.actionItem}><Ionicons name="mic" size={24} color={theme.colors.primary} /><Text style={styles.actionText}>Send a voice clip</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={handlePickDocument}><Ionicons name="attach" size={24} color={theme.colors.primary} /><Text style={styles.actionText}>Attach a file up to 100 MB</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', height: Platform.OS === 'web' ? '100vh' : '100%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 10 : 50, paddingHorizontal: 15, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee', backgroundColor: '#fff' },
  chatArea: { flex: 1 },
  headerInfo: { flex: 1, marginLeft: 10 },
  headerName: { fontSize: 18, fontWeight: 'bold' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  headerStatus: { fontSize: 13, color: '#999', fontWeight: '400' },
  headerActions: { flexDirection: 'row' },
  messageList: { padding: 15 },
  bubbleContainer: { flexDirection: 'row', marginBottom: 15 },
  myBubbleContainer: { justifyContent: 'flex-end' },
  avatarContainer: { alignSelf: 'flex-end', marginRight: 8 },
  smallAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 28, height: 28, borderRadius: 14 },
  bubble: { padding: 12, borderRadius: 22, position: 'relative', overflow: 'hidden' },
  myBubble: { backgroundColor: theme.colors.myBubble, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: theme.colors.theirBubble, borderBottomLeftRadius: 4 },
  replyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginHorizontal: 5 },
  replyHeaderText: { fontSize: 11, color: '#999', marginLeft: 4 },
  nestedReplyQuote: { backgroundColor: 'rgba(0,0,0,0.05)', paddingVertical: 4, paddingHorizontal: 10, marginBottom: 0, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' },
  nestedReplyText: { fontSize: 11, color: '#666', fontStyle: 'normal' },
  timestamp: { fontSize: 10, color: '#999', marginTop: 4, marginHorizontal: 5 },
  reactionsWrapper: { flexDirection: 'row', position: 'absolute', bottom: -12, backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 4, paddingVertical: 2, borderWidth: 1, borderColor: '#eee', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  reactionBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  reactionCount: { fontSize: 10, color: '#666', marginLeft: 1, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 0.5, borderTopColor: '#eee' },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: 25, paddingHorizontal: 15 },
  input: { flex: 1, fontSize: 16, paddingVertical: 10, maxHeight: 100 },
  iconButton: { padding: 8 },
  emojiButton: { padding: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  reactionMenu: { backgroundColor: '#fff', borderRadius: 30, padding: 15, elevation: 10, width: '85%' },
  reactionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10 },
  reactionOption: { marginHorizontal: 2 },
  customizeBtn: { paddingLeft: 10 },
  customizeText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 15 },
  gridAction: { alignItems: 'center' },
  gridText: { fontSize: 12, marginTop: 5, color: '#333' },
  replyPreview: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#f8f9fa', borderTopWidth: 1, borderTopColor: '#eee' },
  replyBar: { width: 4, height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2 },
  replyContent: { flex: 1, marginLeft: 10 },
  replyUser: { fontWeight: 'bold', fontSize: 12, color: theme.colors.primary },
  replyText: { fontSize: 12, color: '#666' },
  actionMenu: { position: 'absolute', bottom: 80, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 20 },
  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  actionText: { marginLeft: 15, fontSize: 16, color: '#333' },
  emojiPickerContainer: { height: 350, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#eee' },
  emojiScroll: { padding: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: 10, paddingHorizontal: 10, margin: 10, marginBottom: 5 },
  searchInput: { flex: 1, paddingVertical: 8, marginLeft: 10, fontSize: 14 },
  categoryTitle: { fontSize: 13, color: '#999', marginVertical: 10, fontWeight: 'bold' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emojiItem: { padding: 8 },
  categoryTabs: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#eee' },
  tabIcon: { padding: 5 },
});
