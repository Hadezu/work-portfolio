import {SimilarTask} from './BuyerJourney';
import {useSharedCopy} from './shared-copy';
import {useLocation} from 'react-router-dom';
import { useLocale, stripLocale } from './locale';
export default function TrustBlock() { const shared=useSharedCopy();
  const {pathname}=useLocation();
  const en=useLocale()==='en';
  const plain=stripLocale(pathname);
  const backend=['/transit-validation','/workflow-access','/healthcare-integration','/erp-sync','/operations-exceptions','/data-quality'].includes(plain);
  const home=plain==='/'||plain==='/automation';
  return <aside className="trust-block shell">{!plain.startsWith("/proof/")&&!['/reconciliation','/operations-exceptions'].includes(plain)&&<SimilarTask example={plain.slice(1)}/>}<strong>{shared.s10fa4d3ee56d}</strong><p>{shared.scab41fdb1fcf}</p>{!home&&<section className="runtime-notes"><h2>{shared.s928ef9c5223e}</h2><h3>{shared.s0f557c587081}</h3><p>{shared.s6a1b281859d8}</p>{backend&&<><p>{shared.s066c61053dac}</p><a href="/lab-api/docs">{shared.s079c7e2134b4}</a></>}</section>}</aside>;
}
