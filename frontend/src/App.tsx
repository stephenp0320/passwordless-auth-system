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
      const success_message = () => toast.custom(
        (t) => (
          <div className={`recovery-toast ${t.visible ? 'toast-enter' : 'toast-exit'}`}>
            <div className="recovery-toast-header">
              <span className="recovery-toast-icon">⚠️</span>
              <span className="recovery-toast-title">RECOVERY CODES</span>
            </div>

            {/* warning message about recovery codes */}
            <p className="recovery-toast-warning">
              Store these somewhere safe. Each code can only be used <strong>once</strong>.
            </p>
            
            {/* grid of recovery codes with index and code value */}
            <div className="recovery-codes-grid">
              {res.recovery_codes.map((code: string, index: number) => (
                <div key={index} className="recovery-code-item">
                  <span className="recovery-code-index">{index + 1}.</span>
                  <code className="recovery-code-value">{code}</code>
                </div>
              ))}
            </div>
            
            {/* actions to copy or download the recovery codes, and a done button to dismiss the toast */}
            <div className="recovery-toast-actions">
              <button 
                className="recovery-btn recovery-btn-copy"
                onClick={async () => {
                  await navigator.clipboard.writeText(res.recovery_codes.join('\n'));
                  toast.success('Copied to clipboard!', { duration: 2000 });
                }}><span>📋</span> Copy</button>
              
              {/* download button that creates a text file with the recovery codes and triggers a download */}
              <button 
                className="recovery-btn recovery-btn-download"
                onClick={() => {
                  // create a downloadable text file with the recovery codes
                  // https://developer.mozilla.org/en-US/docs/Web/API/Blob
                  const content = `PASSWORDLESS AUTH - RECOVERY CODES\n${'='.repeat(40)}\nGenerated: ${new Date().toLocaleString()}\nUsername: ${username}\n${'='.repeat(40)}\n\n${res.recovery_codes.map((code: string, i: number) => `${i + 1}. ${code}`).join('\n')}\n\n${'='.repeat(40)}\nKEEP THESE CODES SAFE!\nEach code can only be used once.\n`;
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  // create a temporary link to trigger the download
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `recovery-codes-${username}.txt`;
                  a.click();
                  // release the object URL after it is downloaded
                  // https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL
                  URL.revokeObjectURL(url);
                  toast.success('Downloaded!', { duration: 2000 });
                }}><span>💾</span> Download</button>
              
              {/* done button to dismiss the toast */}
              <button 
                className="recovery-btn recovery-btn-done"
                // https://react-hot-toast.com/docs/toast#toastdismissid
                onClick={() => toast.dismiss(t.id)}>Saved
              </button>
            </div>
            
            <p className="recovery-toast-footer">
              This is the only time these codes will be shown.
            </p>
          </div>
        ),
        // infinite duration so it doesn't disappear until user clicks done
        // https://react-hot-toast.com/docs/toast#toastoptions
        { duration: Infinity, position: 'top-center' }
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
      addLog('Login failed. Make sure you are registered.', 'error')
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