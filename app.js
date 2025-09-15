
const preview = document.getElementById('preview');
const stepsEl = document.getElementById('steps');
const input = document.getElementById('latex');

function setPreview(tex){
  preview.innerHTML = tex ? `$$${tex}$$` : '';
  if (window.MathJax) MathJax.typesetPromise([preview]);
}
function addStep(title, tex, note){
  const el = document.createElement('div');
  el.className = 'step';
  el.innerHTML = `<div><strong>${title}</strong> ${note?`<small class="muted">— ${note}</small>`:''}</div>` + (tex?`<div class="mono">$$${tex}$$</div>`:'');
  stepsEl.appendChild(el);
  if (window.MathJax) MathJax.typesetPromise([el]);
}
function resetSteps(){ stepsEl.innerHTML = ''; }


const TT = { ID:'ID', LPAR:'(', RPAR:')', COMMA:',', DOT:'.', NOT:'NOT', AND:'AND', OR:'OR', IMP:'IMP', IFF:'IFF', FORALL:'FORALL', EXISTS:'EXISTS', LBRACE:'{', RBRACE:'}' };
const RE_SPACE = /\s+|\\,|\\;|\\:|\\!/g;
function tokenize(src){
  const s = src.replace(RE_SPACE,'');
  const toks = [];
  let i=0;
  function match(cmd){ return s.startsWith(cmd, i); }
  while(i < s.length){
    const c = s[i];
    if (c==='(') { toks.push({t:TT.LPAR}); i++; continue; }
    if (c===')') { toks.push({t:TT.RPAR}); i++; continue; }
    if (c===',') { toks.push({t:TT.COMMA}); i++; continue; }
    if (c==='.') { toks.push({t:TT.DOT}); i++; continue; }
    if (c==='{') { toks.push({t:TT.LBRACE}); i++; continue; }
    if (c==='}') { toks.push({t:TT.RBRACE}); i++; continue; }
    if (c==='\\'){
      const macros = [
        ['\\forall', TT.FORALL], ['\\exists', TT.EXISTS], ['\\neg', TT.NOT], ['\\lnot', TT.NOT],
        ['\\land', TT.AND], ['\\lor', TT.OR], ['\\vee', TT.OR], ['\\wedge', TT.AND],
        ['\\to', TT.IMP], ['\\rightarrow', TT.IMP], ['\\Rightarrow', TT.IMP], ['\\implies', TT.IMP],
        ['\\leftrightarrow', TT.IFF], ['\\Leftrightarrow', TT.IFF], ['\\iff', TT.IFF]
      ];
      let hit=false;
      for(const [m,tt] of macros){
        if (match(m)){ toks.push({t:tt}); i += m.length; hit=true; break; }
      }
      if(hit) continue;
      i++; continue;
    }
    if (/[_A-Za-z]/.test(c)){
      let j=i+1; while(j<s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      toks.push({t:TT.ID, v:s.slice(i,j)}); i=j; continue;
    }
    i++;
  }
  return toks;
}


function parse(src){
  const toks = tokenize(src);
  let k=0; function peek(){ return toks[k]; } function next(){ return toks[k++]; }
  function expect(tt){ const x=next(); if(!x||x.t!==tt) throw new Error('Esperado '+tt); return x; }

  function parseTerm(){
    const tok = peek();
    if(!tok) throw new Error('Fim inesperado em termo');
    if (tok.t===TT.ID){
      const name = next().v;
      if (peek() && peek().t===TT.LPAR){
        next(); // (
        const args=[];
        if (peek() && peek().t!==TT.RPAR){
          args.push(parseTerm());
          while(peek() && peek().t===TT.COMMA){ next(); args.push(parseTerm()); }
        }
        expect(TT.RPAR);
        return {type:'func', name, args};
      }
      if (/^[a-z]/.test(name)) return {type:'var', name};
      return {type:'const', name};
    }
    throw new Error('Token inválido em termo');
  }

  function parseAtom(){
    const id = expect(TT.ID).v; 
    let args = [];
    if (peek() && peek().t===TT.LPAR){
      next();
      if (peek() && peek().t!==TT.RPAR){
        args.push(parseTerm());
        while(peek() && peek().t===TT.COMMA){ next(); args.push(parseTerm()); }
      }
      expect(TT.RPAR);
    }
    return {type:'atom', name:id, args};
  }

  const PREC = { IFF:1, IMP:2, OR:3, AND:4 };
  function parsePrefix(){
    const t = peek();
    if(!t) throw new Error('Expressão vazia');
    if (t.t===TT.NOT){ next(); return {type:'not', of: parsePrefix()}; }
    if (t.t===TT.LPAR){ next(); const e=parseExpr(0); expect(TT.RPAR); return e; }
    if (t.t===TT.FORALL || t.t===TT.EXISTS){
      const qt = next().t===TT.FORALL? 'forall':'exists';
      let first = expect(TT.ID).v;
      let vars=[first];
      while (peek() && peek().t===TT.COMMA){ next(); vars.push(expect(TT.ID).v); }
      if (peek() && peek().t===TT.DOT) next();
      let body;
      if (peek() && peek().t===TT.LPAR){ next(); body=parseExpr(0); expect(TT.RPAR); }
      else body = parseExpr(0);
      let node = body;
      for(let i=vars.length-1;i>=0;i--) node = {type:qt, v:vars[i], of:node};
      return node;
    }
    if (t.t===TT.ID) return parseAtom();
    throw new Error('Início inválido de fórmula');
  }

  function parseExpr(minPrec){
    let left = parsePrefix();
    while(true){
      const op = peek(); if(!op) break;
      const isOp = (op.t===TT.AND||op.t===TT.OR||op.t===TT.IMP||op.t===TT.IFF);
      if(!isOp) break;
      const prec = PREC[op.t];
      if (prec < minPrec) break;
      next();
      const rhs = parseExpr(prec + (op.t===TT.IMP||op.t===TT.IFF?0:1));
      const map = { [TT.AND]:'and', [TT.OR]:'or', [TT.IMP]:'imp', [TT.IFF]:'iff' };
      left = {type:map[op.t], a:left, b:rhs};
    }
    return left;
  }

  const ast = parseExpr(0);
  if(k!==toks.length) throw new Error('Tokens remanescentes após o parse');
  return ast;
}


function clone(x){ return JSON.parse(JSON.stringify(x)); }
function isQuant(n){ return n && (n.type==='forall' || n.type==='exists'); }
function isBin(n,t){ return n && n.type===t; }
function isAtom(n){ return n && n.type==='atom'; }
function isNot(n){ return n && n.type==='not'; }

function mapAst(n, f){
  function rec(x){
    x = f(x) || x;
    switch(x.type){
      case 'not': x.of = rec(x.of); break;
      case 'and':
      case 'or':
      case 'imp':
      case 'iff': x.a = rec(x.a); x.b = rec(x.b); break;
      case 'forall':
      case 'exists': x.of = rec(x.of); break;
      case 'atom': x.args = x.args.map(recTerm); break;
    }
    return x;
  }
  function recTerm(t){
    if(t.type==='func'){ t.args = t.args.map(recTerm); }
    return t;
  }
  return rec(clone(n));
}


function t2tex(t){
  if(t.type==='var' || t.type==='const') return t.name;
  if(t.type==='func') return `${t.name}(${t.args.map(t2tex).join(',')})`;
  throw new Error('Termo inválido');
}
function toTex(n){
  function par(s){ return `\\left(${s}\\right)`; }
  switch(n.type){
    case 'atom': return n.args.length? `${n.name}(${n.args.map(t2tex).join(',')})` : n.name;
    case 'not': return `\\neg\\,${toTex(n.of)}`;
    case 'and': return par(`${toTex(n.a)} \\land ${toTex(n.b)}`);
    case 'or':  return par(`${toTex(n.a)} \\lor ${toTex(n.b)}`);
    case 'imp': return par(`${toTex(n.a)} \\to ${toTex(n.b)}`);
    case 'iff': return par(`${toTex(n.a)} \\leftrightarrow ${toTex(n.b)}`);
    case 'forall': return `\\forall ${n.v}\\, ${toTex(n.of)}`;
    case 'exists': return `\\exists ${n.v}\\, ${toTex(n.of)}`;
  }
  throw new Error('Tipo desconhecido: '+n.type);
}


function elimImpIff(n){
  return mapAst(n, x=>{
    if(x.type==='iff'){
      return {type:'and', a:{type:'imp', a:x.a, b:x.b}, b:{type:'imp', a:x.b, b:x.a}};
    }
    if(x.type==='imp'){
      return {type:'or', a:{type:'not', of:x.a}, b:x.b};
    }
  });
}


function toNNF(n){
  function nn(x){
    if(isAtom(x)) return x;
    if(isNot(x)){
      const a=x.of;
      if(isAtom(a)) return x;
      if(a.type==='not') return nn(a.of);
      if(a.type==='and') return {type:'or', a: nn({type:'not', of:a.a}), b: nn({type:'not', of:a.b})};
      if(a.type==='or')  return {type:'and', a: nn({type:'not', of:a.a}), b: nn({type:'not', of:a.b})};
      if(a.type==='forall') return nn({type:'exists', v:a.v, of:{type:'not', of:a.of}});
      if(a.type==='exists') return nn({type:'forall', v:a.v, of:{type:'not', of:a.of}});
      throw new Error('negação sobre forma não suportada');
    }
    if(x.type==='and' || x.type==='or') return {type:x.type, a: nn(x.a), b: nn(x.b)};
    if(x.type==='forall' || x.type==='exists') return {type:x.type, v:x.v, of: nn(x.of)};
    return x;
  }
  return nn(n);
}


function standardize(n){
  let counter=0;
  const env = new Map();
  function subTerm(t){
    if(t.type==='var' && env.has(t.name)) return {type:'var', name:env.get(t.name)};
    if(t.type==='func') return {type:'func', name:t.name, args:t.args.map(subTerm)};
    return t;
  }
  function walk(x){
    switch(x.type){
      case 'forall':
      case 'exists':{
        const old=x.v, fresh=`${old}_${++counter}`;
        const prev = env.get(old);
        env.set(old,fresh);
        const body = walk(x.of);
        if(prev===undefined) env.delete(old); else env.set(old, prev);
        return {type:x.type, v:fresh, of:body};
      }
      case 'not': return {type:'not', of: walk(x.of)};
      case 'and':
      case 'or':
      case 'imp':
      case 'iff': return {type:x.type, a:walk(x.a), b:walk(x.b)};
      case 'atom': return {type:'atom', name:x.name, args:x.args.map(subTerm)};
    }
    return x;
  }
  return walk(n);
}


function toPrenex(n){
  function lift(x){
    if(x.type==='forall' || x.type==='exists'){
      const inner = lift(x.of);
      return {quants:[{q:x.type,v:x.v}, ...inner.quants], m: inner.m};
    }
    if(x.type==='and' || x.type==='or'){
      const L = lift(x.a), R = lift(x.b);
      return {quants:[...L.quants, ...R.quants], m:{type:x.type, a:L.m, b:R.m}};
    }
    if(x.type==='not') return {quants:[], m:{type:'not', of:x.of}};
    return {quants:[], m:x};
  }
  const {quants, m} = lift(n);
  let out = m;
  for(let i=quants.length-1;i>=0;i--) out = {type:quants[i].q, v:quants[i].v, of:out};
  return {list: quants, matrix: m, ast: out};
}


function substVarInTerm(t, v, by){
  if(t.type==='var' && t.name===v) return clone(by);
  if(t.type==='func') return {type:'func', name:t.name, args:t.args.map(a=>substVarInTerm(a,v,by))};
  return t;
}
function substVar(n, v, by){
  function w(x){
    if(isAtom(x)) return {type:'atom', name:x.name, args:x.args.map(a=>substVarInTerm(a,v,by))};
    if(isNot(x)) return {type:'not', of: w(x.of)};
    if(x.type==='and' || x.type==='or') return {type:x.type, a:w(x.a), b:w(x.b)};
    return x;
  }
  return w(n);
}


function skolemize(pr){
  let idxC=0, idxF=0; const universals=[]; let matrix = clone(pr.matrix);
  const remaining=[];
  for(const q of pr.list){
    if(q.q==='forall'){ universals.push(q.v); remaining.push(q.v); }
    else {
      let term;
      if(universals.length===0){ term={type:'const', name:`c${++idxC}`}; }
      else { term={type:'func', name:`f${++idxF}`, args:universals.map(v=>({type:'var', name:v}))}; }
      matrix = substVar(matrix, q.v, term);
    }
  }
  return {universals: remaining, matrix};
}


function distributeOrOverAnd(n){
  function d(x){
    if(isAtom(x) || isNot(x)) return x;
    if(x.type==='and') return {type:'and', a:d(x.a), b:d(x.b)};
    if(x.type==='or'){
      const A=d(x.a), B=d(x.b);
      if(A.type==='and') return {type:'and', a:d({type:'or', a:A.a, b:B}), b:d({type:'or', a:A.b, b:B})};
      if(B.type==='and') return {type:'and', a:d({type:'or', a:A, b:B.a}), b:d({type:'or', a:A, b:B.b})};
      return {type:'or', a:A, b:B};
    }
    return x;
  }
  return d(n);
}
function distributeAndOverOr(n){
  function d(x){
    if(isAtom(x) || isNot(x)) return x;
    if(x.type==='or') return {type:'or', a:d(x.a), b:d(x.b)};
    if(x.type==='and'){
      const A=d(x.a), B=d(x.b);
      if(A.type==='or') return {type:'or', a:d({type:'and', a:A.a, b:B}), b:d({type:'and', a:A.b, b:B})};
      if(B.type==='or') return {type:'or', a:d({type:'and', a:A, b:B.a}), b:d({type:'and', a:A, b:B.b})};
      return {type:'and', a:A, b:B};
    }
    return x;
  }
  return d(n);
}


function flatten(n){
  if(n.type==='and') return [...flatten(n.a), ...flatten(n.b)];
  return [n];
}
function flattenOr(n){
  if(n.type==='or') return [...flattenOr(n.a), ...flattenOr(n.b)];
  return [n];
}
function literalToTex(l){
  if(isNot(l)) return `\\neg ${toTex(l.of)}`;
  return toTex(l);
}
function clausesFromCNF(n){
  const conj = flatten(n);
  return conj.map(c => flattenOr(c).map(x=>literalToTex(x)));
}
function isHornClause(lits){
  let positives=0;
  for(const L of lits){ if(!/^\\neg\b/.test(L)) positives++; }
  return positives<=1;
}


function run(){
  resetSteps();
  const src = input.value.trim();
  if(!src){ addStep('Erro', '', 'Digite uma fórmula em LaTeX.'); return; }
  try{
    addStep('Entrada', src);
    const ast0 = parse(src);
    addStep('Parse (LaTeX → AST → LaTeX)', toTex(ast0));

    const ast1 = elimImpIff(ast0);
    addStep('1) Eliminar → e ↔', toTex(ast1));

    const ast2 = toNNF(ast1);
    addStep('2) Forma Normal Negativa (NNF)', toTex(ast2));

    const ast3 = standardize(ast2);
    addStep('3) Padronização de variáveis ligadas', toTex(ast3));

    const pr = toPrenex(ast3);
    addStep('4) Forma Prenex (quantificadores na frente)', toTex(pr.ast));

    
    const skol = skolemize(pr);
    const matrixNNF = skol.matrix;
    const cnfMatrix = distributeOrOverAnd(matrixNNF);
    const cnfPrenexAst = skol.universals.reduceRight((acc,v)=>({type:'forall', v, of:acc}), cnfMatrix);
    addStep('5) Prenex CNF (após Skolemização)', toTex(cnfPrenexAst));

    
    const dnfMatrix = distributeAndOverOr(pr.matrix);
    const dnfPrenexAst = pr.list.reduceRight((acc,q)=>({type:q.q, v:q.v, of:acc}), dnfMatrix);
    addStep('6) Prenex DNF', toTex(dnfPrenexAst));

    
    const clauseCNF = cnfMatrix;
    const cls = clausesFromCNF(clauseCNF);
    const clsTex = `\\{ ${cls.map(c=>`\\{ ${c.join(',\n ')} \\}`).join(',\n ')} \\}`;
    addStep('7) Forma Cláusal (conjunto de cláusulas)', clsTex);

    
    const allHorn = cls.length>0 && cls.every(isHornClause);
    const hornTag = document.createElement('div');
    hornTag.innerHTML = `<span class="tag ${allHorn?'ok':'bad'}">${allHorn? 'HORN: SIM' : 'HORN: NÃO'}</span>`;
    const box = document.createElement('div'); box.className='step'; box.appendChild(hornTag);
    stepsEl.appendChild(box);
  }catch(err){
    console.error(err);
    addStep('Erro de análise/transformação', '', err.message||String(err));
  }
}


document.getElementById('btnRender').addEventListener('click', ()=>setPreview(input.value.trim()));
document.getElementById('btnRun').addEventListener('click', run);
document.getElementById('btnClear').addEventListener('click', ()=>{ input.value=''; setPreview(''); resetSteps(); });


input.value = "\\forall x \\exists y ( P(x,y) \\to Q(y) ) \\land \\neg R(x)";
setPreview(input.value);
