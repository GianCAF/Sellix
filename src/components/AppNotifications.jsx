import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const NotificationContext = createContext(null);

const inferType = (message = '') => {
    const text = String(message).toLowerCase();
    if (text.includes('error') || text.includes('no se pudo') || text.includes('sin stock') || text.includes('faltan')) return 'error';
    if (text.includes('offline') || text.includes('contraseña') || text.includes('selecciona') || text.includes('ingresa')) return 'warning';
    return 'success';
};

const ICONS = {
    success: '✓',
    error: '!',
    warning: '!',
    info: 'i'
};

export const AppNotificationsProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [dialog, setDialog] = useState(null);

    const notify = useCallback((message, options = {}) => {
        const type = options.type || inferType(message);
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(current => [...current, { id, message: String(message), type }]);
        window.setTimeout(() => {
            setToasts(current => current.filter(item => item.id !== id));
        }, options.duration || 3600);
    }, []);

    const confirmAction = useCallback((message, options = {}) => new Promise(resolve => {
        setDialog({
            mode: 'confirm',
            title: options.title || 'Confirmar acción',
            message,
            confirmText: options.confirmText || 'Confirmar',
            cancelText: options.cancelText || 'Cancelar',
            danger: options.danger ?? true,
            resolve
        });
    }), []);

    const promptAction = useCallback((message, defaultValue = '', options = {}) => new Promise(resolve => {
        setDialog({
            mode: 'prompt',
            title: options.title || 'Editar dato',
            message,
            value: defaultValue || '',
            confirmText: options.confirmText || 'Guardar',
            cancelText: options.cancelText || 'Cancelar',
            resolve
        });
    }), []);

    const closeDialog = (value) => {
        if (dialog?.resolve) dialog.resolve(value);
        setDialog(null);
    };

    useEffect(() => {
        const nativeAlert = window.alert;
        window.alert = (message) => notify(message);
        window.sellixNotify = notify;
        window.sellixConfirm = confirmAction;
        window.sellixPrompt = promptAction;

        return () => {
            window.alert = nativeAlert;
            delete window.sellixNotify;
            delete window.sellixConfirm;
            delete window.sellixPrompt;
        };
    }, [notify, confirmAction, promptAction]);

    const value = useMemo(() => ({ notify, confirmAction, promptAction }), [notify, confirmAction, promptAction]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <div className="toast-stack">
                {toasts.map(item => (
                    <div key={item.id} className={`toast-card toast-${item.type}`}>
                        <span className="toast-icon">{ICONS[item.type] || ICONS.info}</span>
                        <p>{item.message}</p>
                    </div>
                ))}
            </div>

            {dialog && (
                <div className="app-dialog-overlay">
                    <div className="app-dialog">
                        <div className="app-dialog-mark">{dialog.mode === 'prompt' ? '✎' : '!'}</div>
                        <h2>{dialog.title}</h2>
                        <p>{dialog.message}</p>
                        {dialog.mode === 'prompt' && (
                            <input
                                autoFocus
                                className="app-dialog-input"
                                value={dialog.value}
                                onChange={(e) => setDialog(current => ({ ...current, value: e.target.value }))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') closeDialog(dialog.value);
                                    if (e.key === 'Escape') closeDialog(null);
                                }}
                            />
                        )}
                        <div className="app-dialog-actions">
                            <button onClick={() => closeDialog(null)} className="app-dialog-cancel">
                                {dialog.cancelText}
                            </button>
                            <button
                                onClick={() => closeDialog(dialog.mode === 'prompt' ? dialog.value : true)}
                                className={dialog.danger ? 'app-dialog-danger' : 'app-dialog-confirm'}
                            >
                                {dialog.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
};
