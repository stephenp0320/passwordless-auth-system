import { useState } from "react";
import './educational-panel.css';
// interface for section data
// https://www.geeksforgeeks.org/typescript/what-is-interfaces-and-explain-it-in-reference-of-typescript/
interface Section {
    id: string;
    title: string;
    icon: string;
    content: string[];
}

// educational content for Passkeys
const educationSections: Section[] = [
    {
        id: 'what',
        title: 'What are Passkeys?',
        icon: '🔑',
        content: [
            'Passkeys are a modern replacement for passwords.',
            'They use cryptographic key pairs instead of text passwords.',
            'Your private key never leaves your device - only a public key is shared with websites.',
            'You authenticate using biometrics (Touch ID, Face ID) or a security key.'
        ]
    },
    {
        id: 'how',
        title: 'How does it work?',
        icon: '⚙️',
        content: [
          '1. Registration: Your device creates a unique key pair for this website.',
          '2. Challenge: The server sends a random challenge to prove your identity.',
          '3. Sign: Your authenticator signs the challenge with your private key.',
          '4. Verify: The server verifies the signature using your public key.',
          'This process is called the WebAuthn ceremony.'
        ]
      },
      {
        id: 'why',
        title: 'Why is it secure?',
        icon: '🛡️',
        content: [
          'Phishing-proof: Passkeys are bound to the specific website domain.',
          'No shared secrets: Your private key never leaves your device.',
          'Replay-proof: Each authentication uses a unique challenge.',
          'Biometric protection: Only you can unlock your passkey.',
          'No password reuse: Each site gets a unique credential.'
        ]
      },
      {
        id: 'devices',
        title: 'Supported Devices',
        icon: '📱',
        content: [
          'Platform Authenticators:',
          '• Apple: Touch ID, Face ID (macOS, iOS)',
          '• Windows: Windows Hello',
          '• Android: Fingerprint, Face Unlock',
          '',
          'Security Keys:',
          '• YubiKey, Titan Key, Feitian',
          '• Any FIDO2-certified device'
        ]
      }

];
// educational panel component
// https://react.dev/learn/reusing-logic-with-custom-hooks#sharing-stateful-logic-with-custom-hooks
const EducationPanel = () => {
    // state to track which section is expanded
    const [expandedSection, setExpandedSection] = useState<string | null>('what');
   
    // toggle section expansion
    const toggleSection = (id: string) => {
      setExpandedSection(expandedSection === id ? null : id);
    };
   
    // render the educational panel
    return (
      <div className="education-panel-content">
        <div className="education-header">
          <span className="education-icon">📚</span>
          <h3>Learn About Passkeys</h3>
        </div>
        
        {/* render each education section */}
        <div className="education-sections">
          {educationSections.map((section) => (
            <div 
              key={section.id} 
              className={`education-section ${expandedSection === section.id ? 'expanded' : ''}`}>
              <button 
                className="section-header"
                // toggle this section when header is clicked
                onClick={() => toggleSection(section.id)}>
                <span className="section-icon">{section.icon}</span>
                <span className="section-title">{section.title}</span>
                <span className="section-toggle">
                  {expandedSection === section.id ? '−' : '+'}
                </span>
              </button>
              {/* only show content if this section is expanded */}
              {expandedSection === section.id && (
                <div className="section-content">
                  {section.content.map((line, index) => (
                    <p key={index} className={line === '' ? 'spacer' : ''}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* footer with link to FIDO Alliance */}
        <div className="education-footer">
          <a href="https://fidoalliance.org/passkeys/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="learn-more-link"> Learn more at FIDO Alliance → </a>
        </div>
      </div>
    );
  };

  export default EducationPanel;

