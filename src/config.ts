import type{ NavItems } from './types'

export const NAV_ITEMS: NavItems = {
    home: {
        path: '/',
        title: '主页'
    },
    blog: {
        path: '/blog',
        title: '博客'
    },
    tags: {
        path: '/tags',
        title: '标签'
    },
    media: {
        path: '/media',
        title: '媒体'
    },
    about: {
        path: '/about',
        title: '关于'
    }
}

export const SITE = {
    // Your site's detail?
    name: '王洪涛\'s Blog',
    title: 'WHT\'s Blog',
    description: '欢迎光临',
    url: 'https://astro-ink.vercel.app',
    githubUrl: 'https://github.com/one-aalam/astro-ink',
    listDrafts: true
    // description ?
}

export const PAGE_SIZE = 8
