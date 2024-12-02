import { StyleSheet, Text, View, TextInput, FlatList, TouchableOpacity } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Icon from 'react-native-vector-icons/Entypo';
import { useNavigation } from '@react-navigation/native';

const ChatBot = () => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const flatListRef = useRef(null);

  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI('AIzaSyBu59cmj_H7yKeUcM3yNEYg2KPZSh-vWm0')

  useEffect(() => {
    const welcomeMessage = {
      text: "Xin chào! Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn?",
      isUser: false
    };
    setMessages([welcomeMessage]);
  }, [])

  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = { text: inputText, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    setTimeout(scrollToBottom, 100);

    try {
      const prompt = `
        Bạn là trợ lý tư vấn.
        
        Câu hỏi: ${inputText}
        
        Hãy trả lời ngắn gọn và chính xác. Luôn kết thúc bằng câu hỏi để tương tác với khách hàng.
      `.trim();

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      // Check if the question contains "AI" (case insensitive)
      const containsAI = inputText.toLowerCase().includes('ai');
      const contactInfo = containsAI 
        ? '\n\nVui lòng liên hệ:\nSố điện thoại: 0866787160\nEmail: vuongminhchanh123@gmail.com'
        : '';
      
      const botMessage = { 
        text: response.text() + contactInfo, 
        isUser: false 
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error getting response:', error);
      const errorMessage = { 
        text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.', 
        isUser: false 
      };
      setMessages(prev => [...prev, errorMessage]);
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat Bot</Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={[styles.messageContainer, item.isUser ? styles.userMessage : styles.botMessage]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: 'black' }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Nhập câu hỏi của bạn..."
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Icon name="paper-plane" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default ChatBot

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  messageContainer: {
    padding: 10,
    marginVertical: 5,
    maxWidth: '80%',
    borderRadius: 10,
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  botMessage: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
})