import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

// Mock Lottie animation (replace with your actual lottie.json)
const Lottie = lazy(() => 
  Promise.resolve({
    default: ({ width, height }) => (
      <div 
        style={{ 
          width, 
          height, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}
      >
        🏥
      </div>
    )
  })
);

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [userInputs, setUserInputs] = useState([]);
  const [results, setResults] = useState([]);
  const [btnText, setButtonText] = useState('Send');
  const [error, setError] = useState(null);
  const [inputColors, setInputColors] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const divRef = useRef(null);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const base_url = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const defaultOptions = useMemo(
    () => ({
      loop: true,
      autoplay: true,
      rendererSettings: { preserveAspectRatio: 'xMidYMid slice' },
    }),
    []
  );

  const colors = ['#7886C7', '#578FCA', '#73C7C7', '#5C7285', '#48A6A7'];

  // Debounced API call for suggestions
  const getSuggestion = useCallback(async () => {
    if (!prompt.trim()) return;
    try {
      const response = await axios.get(`${base_url}/suggestion?query=${encodeURIComponent(prompt)}`);
      setSuggestions(response.data || []);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
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

  const formatResponse = useCallback((text) => {
    text = text.replace(/([^:\n]+):\s*/g, '\n- **$1**: ');
    text = text.replace(/\(([^)]+)\)/g, '<span class="text-pink-500">($1)</span>');
    return text;
  }, []);

  const getData = useCallback(async (currentPrompt = prompt) => {
    if (!currentPrompt.trim() || isTypingRef.current) return;
    
    try {
      setButtonText('Wait');
      isTypingRef.current = true;
      
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const currentIndex = userInputs.length;
      
      setUserInputs((prev) => [...prev, currentPrompt]);
      setInputColors((prev) => [...prev, randomColor]);
      setResults((prev) => [...prev, '']);
      setPrompt('');
      setSuggestions([]);

      const response = await axios.get(`${base_url}/answer?query=${encodeURIComponent(currentPrompt)}`);
      let { answer } = response.data;
      
      if (!answer) {
        setResults((prev) => {
          const newResults = [...prev];
          newResults[currentIndex] = 'No answer found for this question.';
          return newResults;
        });
        setButtonText('Send');
        isTypingRef.current = false;
        return;
      }
      
      answer = formatResponse(answer);

      let i = 0;
      const type = () => {
        if (i < answer.length) {
          const currentResult = answer.substring(0, i + 1);
          setResults((prev) => {
            const newResults = [...prev];
            newResults[currentIndex] = currentResult;
            return newResults;
          });
          i++;
          timeoutRef.current = setTimeout(type, 20);
        } else {
          setButtonText('Send');
          isTypingRef.current = false;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        }
      };
      type();
    } catch (error) {
      setError(error?.response?.data?.message || error.message || 'Something went wrong');
      setButtonText('Send');
      isTypingRef.current = false;
    }
  }, [prompt, base_url, formatResponse, userInputs.length]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      getData();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const input = typeof suggestion === 'string' ? suggestion : suggestion.input;
    getData(input);
  };

  useEffect(() => {
    divRef.current?.scrollTo({ top: divRef.current.scrollHeight, behavior: 'smooth' });
  }, [results]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen p-4 text-white bg-[#212121]">
      <div ref={divRef} className="flex-1 overflow-y-auto p-4 rounded-lg mb-8" style={{ scrollbarWidth: 'thin' }}>
        <Suspense fallback={<p>Loading animation...</p>}>
          <Lottie options={defaultOptions} width={55} height={55} />
        </Suspense>
        {results.map((result, index) => (
          <div className="mb-4" key={index}>
            <div className="flex justify-end mb-2">
              <p className="px-4 py-2 rounded-2xl max-w-[80%] break-words" style={{ background: inputColors[index] }}>
                {userInputs[index]}
              </p>
            </div>
            <div className="flex flex-col">
              <div className="bg-gray-700 text-gray-300 p-3 rounded-lg max-w-full break-words">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{result}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {error && (
        <div className="text-center text-red-500 mb-4">
          <p>{error} <a href='/' className="underline">Refresh</a></p>
        </div>
      )}
      
      <div className="relative">
        {suggestions.length > 0 && (
          <div className="absolute bottom-14 left-0 right-0 bg-gray-700 p-3 rounded-lg max-h-40 overflow-y-auto">
            {suggestions.map((suggestion, index) => {
              const displayText = typeof suggestion === 'string' ? suggestion : suggestion.input;
              return (
                <p 
                  key={index} 
                  className="text-sm text-gray-400 cursor-pointer hover:text-white py-1 px-2 hover:bg-gray-600 rounded" 
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {displayText}
                </p>
              );
            })}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about a disease..."
            className="flex-1 p-2 border ps-4 border-gray-600 rounded-full text-gray-100 bg-transparent outline-none"
            disabled={btnText === 'Wait'}
          />
          <button
            onClick={() => getData()}
            disabled={btnText === 'Wait' || !prompt.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            {btnText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
