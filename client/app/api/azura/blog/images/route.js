import {createPageImageHandlers} from '@/lib/azura-page-image-api';
import {listBlogImages,saveBlogImage} from '@/lib/azura-homepage-media.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const {GET,POST}=createPageImageHandlers({listImages:listBlogImages,saveImage:saveBlogImage});
