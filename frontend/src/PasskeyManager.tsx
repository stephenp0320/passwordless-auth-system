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
    
    // Fetch users passkeys 
    const fetch_user_passkeys = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("https://localhost:5001/user/passkeys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username}),
            })

            if (!response.ok){
                throw new Error("Failed to fetch users passkeys");
            }
            const data = await response.json();
            setPasskey(data.passkeys);
        } catch(error) {
            console.log('Issue fetching passkeys:', error)
            setStatus({message: "Error loading passkeys", type: "error"})
        } finally {
            setIsLoading(false)
        }
    };

    const delete_user_passkey = async (passkeyId:number) => {
        const confirmed = confirm("Are you sure you would like to delete this passkey?")
        // finish if they dont want to delete passkey
        if (!confirmed){
            return 
        }

        try {
            const responce = await fetch(`http://localhost:5001/user/passkeys/${passkeyId}`, {
                method:"DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username}),
            })

            if(!responce.ok){
                const data = await responce.json()
                throw new Error(data.error || "Error deleting selected passkey")
            }

            setStatus({message: "Passkey deleted succesfully", type: "success"})
            // refresh users passkeys 
            fetch_user_passkeys()
        } catch(error){
            console.log('Issue fetching passkeys:', error)
            setStatus({message: "Error loading passkeys", type: "error"})
        }
        
    };
}