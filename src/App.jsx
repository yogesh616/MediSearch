import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import axios from 'axios';

import logo from './assets/lottie.json';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

// Lazy-load Lottie for better performance
const Lottie = lazy(() => import('react-lottie'));

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

  const base_url = import.meta.env.VITE_API_URL;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const defaultOptions = useMemo(
    () => ({
      loop: true,
      autoplay: true,
      animationData: logo,
      rendererSettings: { preserveAspectRatio: 'xMidYMid slice' },
    }),
    []
  );

  const colors = ['#7886C7', '#578FCA', '#73C7C7', '#5C7285', '#48A6A7'];

  // Debounced API call for suggestions
  const getSuggestion = useCallback(async () => {
    if (!prompt.trim()) return;
    try {
      const response = await axios.get(`${base_url}suggestion?query=${prompt}`);
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
    if (!currentPrompt.trim()) return;
    try {
      setButtonText('Wait');
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      setUserInputs((prev) => [...prev, currentPrompt]);
      setInputColors((prev) => [...prev, randomColor]);
      setResults((prev) => [...prev, '']);
      setPrompt('');

      const response = await axios.get(`${base_url}answer?query=${currentPrompt}`);
      let { answer } = response.data;
      answer = formatResponse(answer);

      let currentResult = '';
      let i = 0;
      function type() {
        if (i < answer.length) {
          currentResult += answer.charAt(i);
          setResults((prev) => {
            const newResults = [...prev];
            newResults[userInputs.length] = currentResult;
            return newResults;
          });
          i++;
          timeoutRef.current = setTimeout(type, 20);
        } else {
          setButtonText('Send');
          clearTimeout(timeoutRef.current);
        }
      }
      type();
    } catch (error) {
      setError(error?.response?.data?.message || error.message || 'Something went wrong');
      setButtonText('Send');
    }
  }, [prompt, base_url, formatResponse]);

  useEffect(() => {
    divRef.current?.scrollTo({ top: divRef.current.scrollHeight, behavior: 'smooth' });
  }, [results]);

  return (
    <div className="flex flex-col h-screen p-4 text-white bg-[#212121]">
      <div ref={divRef} className="flex-1 overflow-y-auto p-4 element rounded-lg mb-8">
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
            {suggestions.map((suggestion, index) => (
              <p key={index} className="text-sm text-gray-400 cursor-pointer hover:text-white" onClick={() => getData(suggestion.input)}>
                {suggestion.input}
              </p>
            ))}
          </div>
        )}
        <div className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask about a disease..."
            className="flex-1 p-2 border ps-4 border-gray-600 rounded-full text-gray-100 bg-transparent outline-none"
          />
        </div>
      </div>
    </div>
  );
};

export default App;
