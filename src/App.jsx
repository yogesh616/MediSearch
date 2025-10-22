import { useState, useRef, useEffect, useCallback } from 'react';
import { SquarePen, Clock, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchInput } from './components/Input';

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem('conversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentConversationId, setCurrentConversationId] = useState(() => {
    try {
      const saved = localStorage.getItem('currentConversationId');
      return saved || null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const divRef = useRef(null);
  const inputRef = useRef(null);
  const typingQueueRef = useRef([]);
  const isTabVisibleRef = useRef(true);
  const animationFrameRef = useRef(null);

  const base_url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const colors = ['#7886C7', '#578FCA', '#73C7C7', '#5C7285', '#48A6A7'];



//check screen width
useEffect(() => {

    const handleResize = () => {
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        } else {
            setSidebarOpen(true);
        }   
    };

    window.addEventListener('resize', handleResize);  
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
}, []);


  // Save conversations to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  }, [conversations]);

  // Save current conversation ID
  useEffect(() => {
    try {
      if (currentConversationId) {
        localStorage.setItem('currentConversationId', currentConversationId);
      } else {
        localStorage.removeItem('currentConversationId');
      }
    } catch (error) {
      console.error('Error saving current conversation ID:', error);
    }
  }, [currentConversationId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
      if (!document.hidden && typingQueueRef.current.length > 0) {
        processTypingQueue();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const processTypingQueue = useCallback(() => {
    if (!isTabVisibleRef.current || typingQueueRef.current.length === 0) {
      return;
    }

    const { conversationId, messageIndex, fullText, currentIndex } = typingQueueRef.current[0];

    if (currentIndex < fullText.length) {
      const nextText = fullText.substring(0, currentIndex + 1);
      
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.map((msg, idx) =>
                  idx === messageIndex ? { ...msg, text: nextText } : msg
                ),
              }
            : conv
        )
      );

      typingQueueRef.current[0].currentIndex++;
      animationFrameRef.current = requestAnimationFrame(() =>
        setTimeout(processTypingQueue, 5)
      );
    } else {
      typingQueueRef.current.shift();
      setIsTyping(false);
      if (typingQueueRef.current.length > 0) {
        processTypingQueue();
      }
    }
  }, []);

  const getSuggestion = useCallback(async () => {
    if (!prompt.trim()) return;
    try {
      const response = await fetch(
        `${base_url}/suggestion?query=${encodeURIComponent(prompt)}`
      );
      const data = await response.json();
      setSuggestions(data || []);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      setSuggestions([]);
    }
  }, [prompt, base_url]);

  useEffect(() => {
    if (!prompt.trim()) {
      setSuggestions([]);
      return;
    }
    const timeoutId = setTimeout(getSuggestion, 500);
    return () => clearTimeout(timeoutId);
  }, [prompt, getSuggestion]);

  const formatResponse = (text) => {
    text = text.replace(/([^:\n]+):\s*/g, '\n- **$1**: ');
    text = text.replace(/\(([^)]+)\)/g, '<span class="text-pink-400">($1)</span>');
    return text;
  };

  const renderMarkdown = (text) => {
    let html = text;
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br />');
    return { __html: html };
  };

  const getData = useCallback(
    async (currentPrompt) => {
      if (!currentPrompt.trim() || isTyping) return;

      try {
        setIsTyping(true);
        setError(null);
        setSuggestions([]);
        setPrompt('');

        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const timestamp = Date.now();
        
        let convId = currentConversationId;
        let isNewConversation = false;

        if (!convId) {
          convId = `conv_${timestamp}`;
          isNewConversation = true;
          setCurrentConversationId(convId);
        }

        const userMessage = {
          type: 'user',
          text: currentPrompt,
          color: randomColor,
          timestamp,
        };

        const assistantMessage = {
          type: 'assistant',
          text: '',
          timestamp: timestamp + 1,
        };

        let messageIndex;

        if (isNewConversation) {
          const newConv = {
            id: convId,
            title: currentPrompt.substring(0, 50),
            messages: [userMessage, assistantMessage],
            timestamp,
          };
          setConversations((prev) => [newConv, ...prev]);
          messageIndex = 1;
        } else {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === convId
                ? {
                    ...conv,
                    messages: [...conv.messages, userMessage, assistantMessage],
                    timestamp,
                  }
                : conv
            )
          );
          
          const currentConv = conversations.find((c) => c.id === convId);
          messageIndex = currentConv ? currentConv.messages.length + 1 : 1;
        }

        const response = await fetch(
          `${base_url}/answer?query=${encodeURIComponent(currentPrompt)}`
        );
        const data = await response.json();
        let { answer } = data;

        if (!answer) {
          answer = 'No answer found for this question.';
        } else {
          answer = formatResponse(answer);
        }

        typingQueueRef.current.push({
          conversationId: convId,
          messageIndex,
          fullText: answer,
          currentIndex: 0,
        });

        if (typingQueueRef.current.length === 1) {
          processTypingQueue();
        }
      } catch (error) {
        setError(error?.message || 'Something went wrong');
        setIsTyping(false);
      }
    },
    [currentConversationId, conversations, isTyping, processTypingQueue, base_url]
  );

  const handleSuggestionClick = (suggestion) => {
    const input = typeof suggestion === 'string' ? suggestion : suggestion.input;
    getData(input);
  };

  const createNewConversation = () => {
    setCurrentConversationId(null);
    setPrompt('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const deleteConversation = (id) => {
    setConversations((prev) => {
      const filtered = prev.filter((conv) => conv.id !== id);
      
      if (currentConversationId === id) {
        setCurrentConversationId(filtered.length > 0 ? filtered[0].id : null);
      }
      
      return filtered;
    });
  };

  const deleteAllConversations = () => {
    if (window.confirm('Are you sure you want to delete all conversations?')) {
      setConversations([]);
      setCurrentConversationId(null);
      setPrompt('');
      setSuggestions([]);
    }
  };

  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  useEffect(() => {
    if (divRef.current) {
      divRef.current.scrollTop = divRef.current.scrollHeight;
    }
  }, [currentConversation?.messages]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const closeSideBar = () => {
    setSidebarOpen(false);
  }

  return (
   <div className="flex h-screen bg-[#212121] text-white relative overflow-hidden">
      {/* Sidebar Overlay (for mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative top-0 left-0 h-full w-64 bg-[#1a1a1a] border-r border-gray-700 flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out z-50 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Chats</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded hover:bg-gray-700 transition"
            title="Close sidebar"
          >
            ✖
          </button>
        </div>

        {/* Sidebar Buttons */}
        <div className="p-4 border-b border-gray-700 space-y-2 flex flex-col items-start justify-center">
          <button
            onClick={() => {
              createNewConversation();
              closeSideBar();
            }}
            className="w-full px-4 py-2 text-gray-200  rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2"
          >
            <SquarePen size={18} />
            New Chat
          </button>
          {conversations.length > 0 && (
            <button
              onClick={deleteAllConversations}
              className="w-full px-4 py-2 text-gray-200  rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2 text-sm"
            >
              <Trash2 size={16} />
              Delete All
            </button>
          )}
        </div>

        {/* Sidebar Conversations */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 text-sm mt-8 px-4">
              No conversations yet. Start a new chat!
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors group relative ${
                  currentConversationId === conv.id
                    ? "bg-gray-700"
                    : "hover:bg-gray-800"
                }`}
                onClick={() => {
                  setCurrentConversationId(conv.id)
                  closeSideBar();

                }}
              >
                <div className="flex items-start gap-2">
                  <SquarePen size={16} className="mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{conv.title}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <Clock size={12} />
                      {new Date(conv.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-600 rounded"
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-gray-700 flex items-center px-4 gap-4 bg-[#1a1a1a]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <ChevronLeft size={20} />
            ) : (
              <ChevronRight size={20} />
            )}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-lg">
              🏥
            </div>
            <h1 className="text-lg font-semibold">Medical Assistant</h1>
          </div>
        </div>

        {/* Chat Area */}
        <div ref={divRef} className="flex-1 overflow-y-auto p-4">
          {!currentConversation || currentConversation.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-3xl mb-4">
                🏥
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                Welcome to Medical Assistant
              </h2>
              <p className="text-center max-w-md">
                Start typing to get suggestions and ask about diseases, symptoms, or medical conditions
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {currentConversation.messages.map((message, index) => (
                <div key={index} className="mb-6">
                  {message.type === "user" ? (
                    <div className="flex justify-end">
                      <div
                        className="px-4 py-3 rounded-2xl max-w-[80%] break-words"
                        style={{ background: message.color }}
                      >
                        {message.text}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                        🏥
                      </div>
                      <div className="bg-gray-800 text-gray-200 p-4 rounded-2xl max-w-[80%] break-words">
                        <div
                          dangerouslySetInnerHTML={renderMarkdown(message.text)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    🏥
                  </div>
                  <div className="bg-gray-800 text-gray-200 p-4 rounded-2xl">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-2 bg-red-900 bg-opacity-50 text-red-200 text-center">
            {error}{" "}
            <button onClick={() => setError(null)} className="underline ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto relative">
            {suggestions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-lg max-h-64 overflow-y-auto border border-gray-700">
                <div className="p-2 border-b border-gray-700 text-xs text-gray-400">
                  Select a suggestion:
                </div>
                {suggestions.map((suggestion, index) => {
                  const displayText =
                    typeof suggestion === "string"
                      ? suggestion
                      : suggestion.input;
                  return (
                    <div
                      key={index}
                      className="px-4 py-3 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700 last:border-b-0"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <p className="text-sm">{displayText}</p>
                    </div>
                  );
                })}
              </div>
            )}

   <SearchInput
          prompt={prompt}
          setPrompt={setPrompt}
          isTyping={isTyping}
         
          placeholder="Try typing something..."
        />
  


          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
