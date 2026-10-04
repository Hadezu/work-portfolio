import {defineCopy,selectCopy} from './localization-contract';
import {useLocale} from './locale';
export const errorCopy=defineCopy('errors',{
 pl:{request:'Nie udało się wykonać operacji. Sprawdź wejście i spróbuj ponownie.',network:'Nie można połączyć się z usługą. Spróbuj ponownie za chwilę.',json:'Nieprawidłowy JSON. Popraw dane wejściowe i ponów próbę.',file:'Wymagany plik CSV/JSON do 800 kB.',filename:'Nazwa pliku musi wskazywać tabelę, np. orders.csv lub documents.json.',csv:'Nie można odczytać pliku CSV. Sprawdź nagłówki, separator i poprawność danych.',upload:'Wgraj',records:'rekordów',details:'Szczegóły'},
 en:{request:'The operation could not be completed. Check the input and try again.',network:'The service could not be reached. Try again shortly.',json:'Invalid JSON. Correct the input and try again.',file:'A CSV/JSON file of up to 800 kB is required.',filename:'The file name must identify the table, for example orders.csv or documents.json.',csv:'The CSV file could not be read. Check the headers, delimiter and data.',upload:'Upload',records:'records',details:'Details'},
});
export function useErrorCopy(){return selectCopy(errorCopy,useLocale());}
export function useErrorText(){
 const c=useErrorCopy();
 return (error:unknown)=>{
  if(error instanceof SyntaxError)return c.json;
  const raw=String(error);
  if(/FILE_FORMAT|800 kB/.test(raw))return c.file;
  if(/FILE_NAME|Nazwa pliku/.test(raw))return c.filename;
  if(/Failed to fetch|NetworkError|network|pobrać wejścia|pobrać danych|niedostępna/i.test(raw))return c.network;
  const status=raw.match(/HTTP (\d{3})/);
  return c.request+(status?` (HTTP ${status[1]})`:'');
 };
}
