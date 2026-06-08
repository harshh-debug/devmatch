export function safeUser(user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
}) {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
    };
}

export function generateUsername(name: string): string {
    const start = Math.floor(Math.random() * name.length);
    const slice = name.slice(start, start + 3);
    const num = Math.floor(Math.random() * 100);

    return slice + num;
}