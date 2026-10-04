import AutomationExperience from './AutomationExperience';
import {useLocale} from '../locale';
import {selectCopy} from '../localization-contract';
import {automationCopy} from './copy';
export default function AutomationPage(){
 const c=selectCopy(automationCopy,useLocale());
 return <main className="automation-page"><section className="shell automation-page-intro"><span className="kicker">Ivan Matiushkin · {c.identity}</span><h1>{c.product}</h1><p>{c.small}</p></section><AutomationExperience/></main>;
}
