import { useState, useEffect } from "react";
import "./App";

interface Passkey {
    id: number;
    credential_id: string;
    registered_at: string;
}

interface PasskeyManageProps {
    username: string
}

function PasskeyManager({username} : PasskeyManageProps) {

    const [Passkey, setPasskey] = useState<Passkey[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });

    useEffect(() => {
        fetch_user_passkeys();
    }, []);

}