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
    const appName = '11dice'; // Define appName here

    // Effect for session restoration from localStorage
    useEffect(() => {
        const restoreSessionFromLocalStorage = async () => {
            const savedActor = localStorage.getItem('proton_actor');
            const savedPermission = localStorage.getItem('proton_permission');
            const savedChainId = localStorage.getItem('proton_chainId');

            if (savedActor && savedPermission && savedChainId) {
                console.log("Attempting to restore session from localStorage details...");
                console.log("  savedActor:", savedActor);
                console.log("  savedPermission:", savedPermission);
                console.log("  savedChainId from localStorage:", savedChainId);
                try {
                    // First, initialize ProtonWebSDK to get the link object
                    const { link: newLink } = await ProtonWebSDK({
                        linkOptions: { endpoints: ['https://proton.greymass.com'], chainId: savedChainId },
                        selectorOptions: {
                            appName: appName,
                        },
                    });

                    if (newLink) {
                        // Then, try to restore the session using the link object
                        const restoredSession = await newLink.restoreSession(appName, {
                            actor: savedActor,
                            permission: savedPermission,
                        }, savedChainId);

                        if (restoredSession) {
                            setSession(restoredSession);
                            setLink(newLink); // Set the link object
                            console.log("Restored session from link.restoreSession:", restoredSession);
                        } else {
                            console.log("link.restoreSession returned null. Could not re-establish session.");
                            localStorage.removeItem('proton_actor');
                            localStorage.removeItem('proton_permission');
                            localStorage.removeItem('proton_chainId');
                        }
                    } else {
                        console.log("ProtonWebSDK initialization returned null link.");
                        localStorage.removeItem('proton_actor');
                        localStorage.removeItem('proton_permission');
                        localStorage.removeItem('proton_chainId');
                    }
                } catch (e) {
                    console.error("Session re-establishment failed:", e);
                    localStorage.removeItem('proton_actor');
                    localStorage.removeItem('proton_permission');
                    localStorage.removeItem('proton_chainId');
                }
            } else {
                console.log("No saved session details found in localStorage.");
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
                    appName: appName,
                    appLogo: 'https://avatars.githubusercontent.com/u/6749354?s=200&v=4',
                    requestAccount: 'inchgame', // This is the contract account
                },
            });
            setSession(newSession);
            setLink(newLink);
            // Save minimal session details to localStorage
            localStorage.setItem('proton_actor', newSession.auth.actor);
            localStorage.setItem('proton_permission', newSession.auth.permission);
            localStorage.setItem('proton_chainId', newSession.chainId.toString()); // Use toString() for ChainId object
            console.log("New session after login:", newSession); // Debug log
            console.log("New session link:", newLink); // Debug log
            console.log("New session chainId:", newSession.chainId); // Debug log
        } catch (e) {
            console.error("Login failed", e);
        }
    };

    const logout = async () => {
        if (link && session) {
            try {
                await link.removeSession('11dice', session.auth, session.chainId);
                // Clear persistence
                localStorage.removeItem('proton_actor');
                localStorage.removeItem('proton_permission');
                localStorage.removeItem('proton_chainId');
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