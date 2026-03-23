import { startRegistration, startAuthentication, browserSupportsWebAuthnAutofill } from "@simplewebauthn/browser";
import { useEffect, useState , useRef} from 'react';
import './App.css';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import LiveLog, { useLiveLog } from './LiveLog';
import ThemeSelector from './ThemeSelector';
import EducationPanel from './educational-panel';


// https://simplewebauthn.dev/docs/packages/browser
// https://react.dev/reference/react/useState
function App() {
  const [username, setUsername] = useState("")
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' })
  const [isLoading, setIsLoading] = useState(false)
  const conditionalLoginStarted = useRef(false);
  const navigate = useNavigate();
  const { logs, addLog, clearLogs } = useLiveLog();



  // Passkey registration flow
  const register = async (authenticator_type: string = 'platform') => {
    if (!username.trim()) {
      setStatus({ message: 'Please enter a username', type: 'error' })
      return
    }
    
    setIsLoading(true)
    setStatus({ message: '', type: '' })
    clearLogs() 
    
    try {
      addLog('Initiating registration ceremony...', 'info')
      addLog(`Username: ${username}`, 'info')
      addLog(`Authenticator type: ${authenticator_type}`, 'info')

      // Fetch registration options from server
      // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
      const response = await fetch("http://localhost:5001/register/start", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ username, authenticator_type: authenticator_type }),
      });

      const options = await response.json();
      addLog('Challenge received from server', 'success')
      addLog(`Challenge: ${options.publicKey.challenge.substring(0, 20)}...`, 'info') 
      addLog('Awaiting authenticator response...', 'waiting')

      console.log("Options received:", options);
      // Trigger browser's WebAuthn credential creation
      // https://simplewebauthn.dev/docs/packages/browser#startregistration
      const credentials = await startRegistration(options.publicKey);
      addLog('Credential created by authenticator', 'success')
      addLog(`Credential ID: ${credentials.id.substring(0, 16)}...`, 'info') 

      addLog('Sending credential to server for verification...', 'info')
      const finish_response = await fetch("http://localhost:5001/register/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, credential: credentials }),
      });

      // check if recovery codes are returned
      const res = await finish_response.json()
      addLog('Server verified credential', 'success')
      addLog(`User ${username} registered successfully!`, 'success')
      const error_message = () => toast.error(res.error || 'Registration failed. Please try again.', { duration: 5000 });
      const success_message = () => toast.success(
        (t) => (
          <div className="toast-container">
            <strong>Save these recovery codes!</strong>
            <pre className="toast-codes">
              {res.recovery_codes.join('\n')}
            </pre>
            <div className="toast-buttons">
              <button 
                className="toast-copy-btn"
                onClick={async () => {
                  await navigator.clipboard.writeText(res.recovery_codes.join('\n'));
                  toast.success('Copied!');
                }}> Copy </button>
              <button className="toast-close-btn" onClick={() => toast.dismiss(t.id)}>Close</button>
            </div>
          </div>
        ),
        { duration: 30000 }
      );

      // https://react-hot-toast.com/docs
      // simple recovery code toast pop-up
      if (res.recovery_codes) {
        addLog(`Generated ${res.recovery_codes.length} recovery codes`, 'info')
        success_message();
      } else {
        error_message();
      }
      

      console.log(`${username} registered with ${res.authenticator_type}`)
      setStatus({ message: 'Registration successful! You can now login.', type: 'success' })
    } catch (error) {
      console.error(error)
      addLog('Registration failed', 'error')
      addLog(`Error: ${error}`, 'error')
      setStatus({ message: 'Registration failed. Please try again.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  };

  // Passwordless login flow
  const login = async () => {
    if (!username.trim()) {
      setStatus({ message: 'Please enter a username', type: 'error' })
      return
    }
    
    setIsLoading(true)
    setStatus({ message: '', type: '' })
    clearLogs()
    
    try {
      addLog('Initiating authentication ceremony...', 'info')
      addLog(`Username: ${username}`, 'info')

      // Fetch authentication options from server
      const response = await fetch("http://localhost:5001/login/start", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        addLog('User not found', 'error')
        throw new Error('User not registered')
      }

      const options = await response.json();
      addLog('Challenge received from server', 'success')
      addLog('Awaiting authenticator response...', 'waiting')
      console.log("Login options received:", options);

      //Trigger browser's WebAuthn authentication
      //https://simplewebauthn.dev/docs/packages/browser#startauthentication
      const assertion = await startAuthentication(options.publicKey);
      addLog('Signature generated by authenticator', 'success')

      // Send assertion to server for verification
      addLog('Verifying signature with server...', 'info')
      await fetch("http://localhost:5001/login/finish", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ username, credential: assertion }),
      });
      
      addLog('Signature verified successfully', 'success')
      addLog(`Welcome back, ${username}!`, 'success')
      setStatus({ message: `Welcome back, ${username}!`, type: 'success' })
      navigate('/admin') // naviagtes to the admin screen
    } catch (error) {
      console.error(error)
      addLog('Authentication failed', 'error')
      setStatus({ message: 'Login failed. Make sure you are registered.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  };

  // Passwordless login flow
  const usernamelessLogin = async () => {
    setIsLoading(true)
    setStatus({ message: '', type: '' })
    
    try { // start the login without the need for username
      const response = await fetch("http://localhost:5001/login/start/usernameless", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const options = await response.json();
      console.log("Usernameless login options received:", options);

      //Trigger browser's WebAuthn authentication
      //https://simplewebauthn.dev/docs/packages/browser#startauthentication
      const assertion = await startAuthentication(options.publicKey);

      // server gets the username from usr_handle
      const finishRes = await fetch("http://localhost:5001/login/finish/usernameless", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ credential: assertion }),
      });

      const result = await finishRes.json();
      if (!finishRes.ok){
        throw new Error(result.error|| 'Login failed')
      }    
      
      setStatus({ message: `Welcome back, ${username}!`, type: 'success' })
      navigate('/admin') // naviagtes to the admin screen
    } catch (error) {
      console.error(error)
      setStatus({ message: 'Login failed. Make sure you are registered.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  };

   // conditional login flow
   // https://react.dev/reference/react/useCallback
  // use effect used and useRef to fix bug with multiple calls
  // https://react.dev/reference/react/useRefs
  useEffect(() => {
    const conditionalLogin = async () => {
      if (conditionalLoginStarted.current === true) {
        return;
      }

      setIsLoading(true)
      setStatus({ message: '', type: '' })
      
      try { 
        //const available = await PublicKeyCredential.isConditionalMediationAvailable();
        const autofillSupported = await browserSupportsWebAuthnAutofill();
        if (!autofillSupported){
          console.log("Conditional login not supported")
          return;
        }
  
        const response = await fetch("http://localhost:5001/login/start/usernameless", {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({}),
        });
  
        if (!response.ok) {
          throw new Error('Login failed')
        }
  
        const options = await response.json();
        console.log("Usernameless login options received:", options);
  
        //Trigger browser's WebAuthn authentication
        //https://simplewebauthn.dev/docs/packages/browser#startauthentication
        const assertion = await startAuthentication({
          optionsJSON: options.publicKey,
          useBrowserAutofill: true
        });
  
        // server gets the username from usr_handle
        const finishRes = await fetch("http://localhost:5001/login/finish/usernameless", {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({ credential: assertion }),
        });
  
        const result = await finishRes.json();
        if (!finishRes.ok){
          throw new Error(result.error|| 'Login failed')
        }    
        
        toast.success(`Welcome back, ${result.username}!`);
        navigate('/admin') // naviagtes to the admin screen
      } catch (error) {
        // still throws an abort error due to new WebAuthn ceromony being started
        // this aborts the waiting conditionalLogin logic.
        console.error("Conditional AbortError: ", error)
        //setStatus({ message: 'Conditional login failed.', type: 'error' })
      } finally {
        setIsLoading(false)
      }
    };
    conditionalLogin();
  }, [navigate]);

  //UI Component
  //https://react.dev/learn/writing-markup-with-jsx
  return (
    <div className="container">
      {/* Theme selector component to switch between color themes */}
      <ThemeSelector />
    <div className="card-wide">
      <div className="card-header">
        <div className="icon">🔐</div>
        <h1>Passwordless Auth</h1>
        <p className="subtitle">Secure authentication using passkeys</p>
      </div>
        
        <div className="card-body">
          <div className="panel education-panel">
            <EducationPanel />
          </div>
          <div className="panel auth-panel">
        <p className="recovery-link">
          Lost your device? <a href="/recover">Recover account</a>
        </p>
        <div className="form">
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            autoComplete="webauthn"
          />
          
          <div className="buttons">
            <button onClick={() => register('platform')} disabled={isLoading} className="btn-primary">
              {isLoading ? 'Please wait...' : 'Register Passkey'}
            </button>
            <button onClick={() => register('cross-platform')} disabled={isLoading} className="btn-primary">
              {isLoading ? 'Please wait...' : 'Register with Security Key'}
            </button>
            <button onClick={login} disabled={isLoading} className="btn-secondary">
              {isLoading ? 'Please wait...' : 'Login with username'}
            </button>
            <button onClick={usernamelessLogin} disabled={isLoading} className="btn-secondary">
              {isLoading ? 'Please wait...' : 'Login with Passkey'}
            </button>
          </div>
        </div>



        {status.message && (
          <div className={`status ${status.type}`}>
            {status.message}
          </div>
        )}
          </div>
          <div className="panel log-panel">
            <LiveLog logs={logs} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App