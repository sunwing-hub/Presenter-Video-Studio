import React from 'react'
import {createRoot} from 'react-dom/client'
import {ExportPanel} from '../src/ExportPanel'
const w=window as unknown as {fixture:{mainMediaId:string};calls:number};w.calls=0
createRoot(document.getElementById('root')!).render(<ExportPanel kind="mp4" open close={()=>{}} duration={30} width={1080} height={1920} sourceMediaId={w.fixture.mainMediaId} makePayload={async()=>{w.calls++;return w.fixture}} />)
