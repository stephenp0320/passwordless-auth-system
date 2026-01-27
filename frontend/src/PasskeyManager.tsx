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

