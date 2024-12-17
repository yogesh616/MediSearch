import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import axios from 'axios';
import Lottie from 'react-lottie';
import logo from './assets/lottie.json';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import './AudioPlayer.css'
import './popup.css'

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [userInputs, setUserInputs] = useState([]);
  const [results, setResults] = useState([]);
  const [check, setCheck] = useState(0);
  const divRef = useRef(null);
  const [btnText, setButtonText] = useState('Send');
  const [images, setImages] = useState([]);
  const [hyperlinks, setHyperlinks] = useState([]);
  const [audioUrl, setAudioUrl] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const [error, setError] = useState(null);

  const base_url = 'http://localhost:7000/'
  const prod_url = 'https://intelli-chat-server.vercel.app/'

  function focusInput() {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }
  useEffect(() => {
    focusInput();
  }, [])

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: logo,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  const getData = async () => {
    try {
      setUserInputs(prev => [...prev, prompt]); // Add user input instantly to the UI
      setResults(prev => [...prev, '']); // Reserve space for the result
      setImages(prev => [...prev, '']);  // Reserve space for the image
      setHyperlinks(prev => [...prev, '']);  // Reserve space for hyperlink
      setAudioUrl(prev => [...prev, '']);  // Reserve space for audio URL
      setCheck(prev => prev + 1);  // Increment check for indexing
  
      setButtonText('Wait');
      const currentPrompt = prompt; // Save current prompt
      setPrompt(''); // Clear input instantly
  
      const response = await axios.post(prod_url, { prompt: currentPrompt });
      const { longestData, yahooSummary, audioURL } = response.data;
      const { src: imageSrc, href: hyperlinkHref } = yahooSummary;
  
      let currentResult = '';
      let i = 0;
  
      function type() {
        if (i < longestData.length) {
          currentResult += longestData.charAt(i);
          setResults(prev => {
            const newResults = [...prev];
            newResults[check] = currentResult;
            return newResults;
          });
          i++;
          setTimeout(type, 20);
        } else {
          setButtonText('Send');
          setImages(prev => {
            const newImages = [...prev];
            newImages[check] = imageSrc;
            return newImages;
          });
          setHyperlinks(prev => {
            const newHyperlinks = [...prev];
            newHyperlinks[check] = hyperlinkHref;
            return newHyperlinks;
          });
          setAudioUrl(prev => {
            const newAudioUrl = [...prev];
            newAudioUrl[check] = audioURL;
            return newAudioUrl;
          });
        }
      }
  
      type();
  
    } catch (error) {
      console.error(error.message);
      setError(error.message);
      setButtonText('Send');
    }
  };
  

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      getData();
    }
  };

  useEffect(() => {
    if (divRef.current && results.length > 0) {
      divRef.current.scrollTo({ top: divRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [results]);

  return (
    <div className="app-container">
      <div ref={divRef} className="results-container">
        <Lottie options={defaultOptions} width={55} height={55} />
        {results.map((result, index) => (
  <div className="result-item" key={index}>
    <div className="user-input">
      <p className="user-input-text">{userInputs[index]}</p>
    </div>
    <div className="result">
      <p className="result-text">{result}</p>
      {/* Conditionally render AudioPlayer only if audioUrl is defined */}
      
      {hyperlinks[index] && images[index] && (
        <a href={hyperlinks[index]} target="_blank" rel="noopener noreferrer">
          <img className="img" src={images[index]} alt="Result" />
        </a>
      )}
    </div>
  </div>
))}

      </div>

      {
        error && (
          <div className="error-container">
            <p className="error-text">{error} <a href='/'>Refresh</a></p>
          </div>
        )
      }
      <div className="input-group">
        <input ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKey}
          placeholder=" Message IntelliChat"
          className="input-field"
        />
        <button onClick={getData} className="send-button">
          {btnText}
        </button>
      </div>
      <div className='text-center mb-1'>
        <p className='text-secondary my-2 opacity-75 info'>
          IntelliChat can make mistakes. <span style={{cursor: 'pointer'}} onClick={handleOpen} >Check important info. </span>
        </p>
      </div>

      {/* Popup */}
      {isOpen && (
        <div className="popup" style={{ display: 'none'}}>
          <div className="popup-content">
            <span className="close-btn" onClick={handleClose}>
              &times;
            </span>
            <h2>Web Scraper Documentation</h2>
            <p>To find details for a person, write the name with "<strong>who is or was</strong>".</p>
            <p>To download a song, write "<strong>songname song mp3 download pagalfree</strong>".</p>
            <p>
              <strong>Note:</strong> <em>Pagalfree</em> is important for finding the audio file on the server.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
