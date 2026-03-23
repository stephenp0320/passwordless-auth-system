import { useState } from "react";
import './EducationPanel.css';
// interface for section data
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
