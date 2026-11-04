export function studioOrigin(env=process.env){
 const port=String(env.OVERLAY_STUDIO_PORT||5173)
 const origin=env.STUDIO_ORIGIN||env.OVERLAY_STUDIO_URL||`http://127.0.0.1:${port}`
 if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('工作台地址必须是本机HTTP地址与明确端口')
 const n=Number(new URL(origin).port);if(n<1024||n>65535)throw Error('工作台端口无效')
 return origin
}
