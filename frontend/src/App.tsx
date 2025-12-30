import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { useState } from 'react';

function App() {
  const [username, setUsername] = useState("")

  const register = async () => {
    const res = await fetch("http://localhost:5000/register/start", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const options = await res.json();
    const credentials = await startRegistration(options);
    await fetch("http://localhost:5000/register/finish", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ username, credentials }),
    });
    alert("Registration Successful!")
  }
  return (
    <>
      <h1>Passwordless Authentiction System</h1>
      <div className="card">
        <p>
          it's great becuase it replaces passwords!!!
        </p>
      </div>
    </>
  )
}


export default App
