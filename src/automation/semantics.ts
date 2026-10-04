import {businessCopy} from './business';
import {defineCopy} from '../localization-contract';
import type {Preset, PatternId} from './config';
import {automationCopy} from './copy';
import type {Locale} from '../locale';

// Only these fixture-backed industry scenarios claim an executable business flow.
export function executionKind(preset:Preset, pattern:PatternId){
 return pattern==='reconciliation'?'comparison':pattern===preset.defaultPattern?'scenario':'outline';
}
export const comparisonRules = [
 {id:'comparison-missing',kind:'missing' as const,copy:defineCopy('comparison-missing',{pl:{label:'Brak pary w zestawie B',action:'Sprawdź referencję i kompletność eksportu.'},en:{label:'No matching record in dataset B',action:'Check the reference and export completeness.'}})},
 {id:'comparison-mismatch',kind:'mismatch' as const,copy:defineCopy('comparison-mismatch',{pl:{label:'Różnica wartości',action:'Wyjaśnij różnicę; raport nie zmienia danych.'},en:{label:'Value mismatch',action:'Investigate the difference; the report does not change data.'}})},
 {id:'comparison-duplicate',kind:'duplicate' as const,copy:defineCopy('comparison-duplicate',{pl:{label:'Niejednoznaczny klucz',action:'Wyjaśnij duplikaty przed łączeniem rekordów.'},en:{label:'Ambiguous key',action:'Resolve duplicates before matching records.'}})},
];
export function builderScope(locale:Locale,source:number,task:number,target:number,reference:string,key:string){
 const c=automationCopy[locale];
 return (task===2?c.comparisonScope:c.scopeTemplates[task]).replace('{0}',c.sources[source]).replace('{1}',c.destinations[target]).replace('{2}',(reference.trim()||businessCopy[locale].unknown)).replace('{3}',(key.trim()||businessCopy[locale].unknown));
}
