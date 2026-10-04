import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { LocaleContext, type Locale } from './locale';
export function renderToStaticMarkup(node:ReactNode,locale:Locale='pl'){
  return render(createElement(LocaleContext.Provider,{value:locale},node));
}
