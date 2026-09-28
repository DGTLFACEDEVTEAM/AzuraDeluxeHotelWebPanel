import {blogHandler} from '@/lib/azura-blog-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=blogHandler('list');
export const POST=blogHandler('create');
