function getPlatform(url) {
    const platforms = [
        { name: 'INSTAGRAM', pattern: /instagram\.com/ },
        { name: 'TWITTER', pattern: /twitter\.com/ },
        { name: 'FACEBOOK', pattern: /facebook\.com/ },
        { name: 'YOUTUBE', pattern: /youtube\.com|youtu\.be/ },
        { name: 'SNAPCHAT', pattern: /snapchat\.com/ }
    ];

    for (const platform of platforms) {
        if (platform.pattern.test(url)) {
            return platform.name;
        }
    }

    return 0;
}

export default getPlatform;
