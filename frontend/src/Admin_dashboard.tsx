import { useState, useEffect } from 'react';

interface User {
    username: string;
    registered_at: string;
    credential_id: string;
}

function Admin() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  
    // Fetch users on component mount
    // Reference: https://react.dev/reference/react/useEffect
    useEffect(() => {
        fetch_registered_users();
    }, []);

 // https://www.geeksforgeeks.org/typescript/how-to-use-fetch-in-typescript/
    const fetch_registered_users = async () => {
        setIsLoading(true);
        try {
            const responce = await fetch("http://localhost:5001/admin/users");
            if (!responce.ok){
                throw new Error('failed to fetch registered user');
            }
            const data = await responce.json();
            setUsers(data.users);
        } catch (error) {
            console.log('issue retrieving registered user', error)
            setStatus({ message: 'Failed to load users', type: 'error' });
        } finally {
            setIsLoading(false)
        }
    }


    const revoke_credential = async (username : string) => {
        const answer = confirm(`Are you sure you want to revoke credentials for ${username} `)
        if (!answer) {
            return;
        }

        try {
            const responce = await fetch("http://localhost:5001/admin/revoke", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            });

            if (!responce.ok){
                throw new Error(`Credential revoked failed for ${username}`);
            }
            setStatus({ message: `Credential Revoked for ${username}`, type: 'success' });
            fetch_registered_users() //refresh users
        } catch (error) {
            console.log(error)
            setStatus({ message: `Failed to revoke credential for ${username}`, type: 'error' });

        }

    };




}