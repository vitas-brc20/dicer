"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import ProtonWebSDK from '@proton/web-sdk'; // Use the default import as a function

const WalletContext = createContext({
    session: null,
    link: null, // Need to store link for logout
    login: async () => {},
    logout: async () => {},
    transact: async (actions) => { throw new Error("Wallet not connected"); }
});

export const WalletProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [link, setLink] = useState(null); // Store link for logout

    // Effect for session restoration from localStorage (user's suggested approach)
    useEffect(() => {
        const restoreSessionFromLocalStorage = async () => {
            const savedSessionString = localStorage.getItem('proton-session');
            console.log("Attempting to restore session from localStorage...");
            console.log("  savedSessionString:", savedSessionString);

            if (savedSessionString) {
                try {
                    const parsedSession = JSON.parse(savedSessionString);
                    // Check if the parsed session is functional enough (e.g., has transact method)
                    if (parsedSession && typeof parsedSession.transact === 'function') {
                        setSession(parsedSession);
                        // Note: The 'link' object is not directly stored/restored this way.
                        // This might cause issues with logout. We'll need to address that.
                        console.log("Restored session from localStorage (parsed):", parsedSession);
                    } else {
                        console.log("Parsed session is not functional, clearing localStorage.");
                        localStorage.removeItem('proton-session');
                    }
                } catch (e) {
                    console.error("Could not parse saved session from localStorage:", e);
                    localStorage.removeItem('proton-session');
                }
            } else {
                console.log("No saved session found in localStorage.");
            }
        };
        restoreSessionFromLocalStorage();
    }, []); // Run once on mount

    const login = async () => {
        try {
            const { session: newSession, link: newLink } = await ProtonWebSDK({
                linkOptions: { endpoints: ['https://proton.greymass.com'] },
                transportOptions: { requestStatus: false },
                selectorOptions: {
                    appName: '11dice',
                    appLogo: 'https://avatars.githubusercontent.com/u/6749354?s=200&v=4',
                    requestAccount: 'inchgame', // This is the contract account
                },
            });
            setSession(newSession);
            setLink(newLink);
            // Save entire session object to localStorage (user's suggested approach)
            localStorage.setItem('proton-session', JSON.stringify(newSession));
            console.log("New session after login:", newSession); // Debug log
        } catch (e) {
            console.error("Login failed", e);
        }
    };

    const logout = async () => {
        if (link && session) {
            try {
                await link.removeSession('11dice', session.auth, session.chainId);
                // Clear persistence
                localStorage.removeItem('proton-session');
                setSession(null);
                setLink(null);
            } catch (e) {
                console.error("Logout failed", e);
            }
        }
    };

    const transact = async (actions) => {
        if (!session) {
            throw new Error("Cannot transact without a session");
        }
        try {
            const result = await session.transact({ actions });
            return result;
        } catch (e) {
            console.error("Transaction failed", e);
            throw e;
        }
    };

    return (
        <WalletContext.Provider value={{ session, link, login, logout, transact }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};
