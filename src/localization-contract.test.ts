import './home-journey-copy';
import './automation/semantics';
import './automation/config';
import './automation/copy';
import './not-found-copy';
import { describe, expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { assertLocalized, localizationSources, selectCopy } from './localization-contract';
import { useLocale } from './locale';
import { flattenCopy, languageLeaks } from './language-audit';
import './home-copy';
import './proof-copy';
import './proof-labels';
import './localized-count';
import './domain-copy';
import './transit-copy';
import './transit-ui-copy';
import './api-copy';
import './quality-copy';
import './quality-views-copy';
import './shared-copy';
import './error-copy';
import './metadata-copy';
import './contact-copy';
import './practical-copy';
import './inquiry-attribution';
import './task-fit';

describe('bidirectional locale contract',()=>{
  test.each([
    {en:{title:'Hello'}}, {pl:{title:'Cześć'}},
    {pl:{title:''},en:{title:'Hello'}}, {pl:{title:'Cześć'},en:{title:''}},
    {pl:{nested:{title:'Cześć'}},en:{nested:{}}},
    {pl:{items:['Raz','Dwa']},en:{items:['One']}},
    {pl:{title:null},en:{title:null}}, {pl:{},en:{}},
  ])('rejects incomplete source tree %j',copy=>expect(()=>assertLocalized('broken',copy)).toThrow());
  test('rejects missing provider instead of selecting a default language',()=>{
    function Component(){return createElement('p',null,useLocale());}
    expect(()=>renderToStaticMarkup(createElement(Component))).toThrow('authoritative');
  });
  test('rejects unsupported locales without fallback',()=>expect(()=>selectCopy({pl:'Polski',en:'English'},'de' as 'pl')).toThrow());
  for(const [name,copy] of localizationSources()){
    test(`${name}: both source trees are complete`,()=>expect(()=>assertLocalized(name,copy)).not.toThrow());
    test(`${name}: prose is not copied unchanged between languages`,()=>{
      const english=new Map(flattenCopy(copy.en));
      const copied=flattenCopy(copy.pl).filter(([path,value])=>{
        if(value!==english.get(path))return false;
        if(value.startsWith('/'))return false; // Asset and route paths.
        if(['GTFS / GTFS-RT / NeTEx / SIRI','GTFS · GTFS-RT · NeTEx · SIRI','Observation/o001 · subject.reference · Patient/p001 → Patient/p999','targetId:string, externalId:string, accepted:true'].includes(value))return false; // Protocol names and exact contract evidence.
        if(/^[A-Z\d\s→/·_-]+$/.test(value)||/[=<>]/.test(value))return false;
        const words=value.match(/[A-Za-z]{2,}/g)??[];
        return words.length>=4;
      });
      expect(copied).toEqual([]);
    });
    for(const locale of ['pl','en'] as const)test(`${name}: ${locale} wrong-language source fields = 0`,()=>{
      const leaks=flattenCopy(copy[locale]).flatMap(([path,value])=>languageLeaks(value,locale).length?[{path,value,matches:languageLeaks(value,locale)}]:[]);
      expect(leaks).toEqual([]);
    });
  }
  test.each(['Integration & Acceptance','View working example','Validation kontraktów API','Reconciliation i validation migracji','Reports odbiorowe / evidence'])('detects PL regression: %s',phrase=>expect(languageLeaks(phrase,'pl').length).toBeGreaterThan(0));
  test('allows deliberate technical vocabulary',()=>expect(languageLeaks('API REST JSON CSV XML SQL HTTP webhook checkpoint retry replay PASS FAIL FHIR HL7 DICOM RBAC schema drift lineage','pl')).toEqual([]));
});
