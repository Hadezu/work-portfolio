import {renderToReadableStream} from 'react-dom/server';
import {StaticRouter} from 'react-router-dom';
import App from '../src/App';

export async function renderPage(location:string){
  const stream=await renderToReadableStream(<StaticRouter location={location}><App/></StaticRouter>);
  await stream.allReady;
  return new Response(stream).text();
}
