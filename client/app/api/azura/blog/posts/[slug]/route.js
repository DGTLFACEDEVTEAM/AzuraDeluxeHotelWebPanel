import {blogHandler} from '@/lib/azura-blog-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=blogHandler('get');
export const PUT=blogHandler('update');
export const DELETE=blogHandler('delete');
