## Transformações Lógicas — Prenex CNF/DNF, Forma Cláusal & Horn

Este projeto se trata de um desafio da disciplina de **Programação Lógica e Funcional** do curso de **Ciência da Computacão**, cujo objetivo consiste em uma página web contendo uma caixa de texto na qual o usuário irá entrar com uma fórmula em latex. Uma vez que a formula seja digitada, ela é renderizada em notação matemática usando a biblioteca **mathjax**.  Além disso, o sistema transforma, passo a passo, a fórmula entrada em **Forma Normal Conjuntiva Prenex**, **Fórmula Normal Disjuntiva Prenex**, **Forma Cláusal** e **Cláusula de Horn**. 

### Principais Funções:
- renderiza uma **fórmula em LaTeX**;
- mostra as **transformações passo a passo**;
- gera **Prenex CNF**, **Prenex DNF**, **Forma Cláusal** e
- verifica se o conjunto de cláusulas é **Horn** (≤ 1 literal positivo por cláusula).

### Como usar:
1. Digite a fórmula em LaTeX na caixa de texto.
2. Clique **Renderizar fórmula** para ver a visualização.
3. Clique **Transformar (passo a passo)** para ver todas as etapas.
4. Use **Limpar** para começar de novo.

### Sintaxe suportada (entrada):
- **Quantificadores:** `\forall`, `\exists`
- **Conectivos:** `\neg` (ou `\lnot`), `\land` (ou `\wedge`), `\lor` (ou `\vee`),  
  `\to` (ou `\rightarrow`, `\Rightarrow`, `\implies`),  
  `\leftrightarrow` (ou `\Leftrightarrow`, `\iff`)
- **Parênteses, vírgulas e ponto:** `(` `)` `,` `.`
- **Átomos/predicados:** `P`, `Q(x)`, `R(x,y)`, etc.
- **Termos:** variáveis (minúsculas: `x`, `y`), constantes (maiúsculas: `A`, `B`) e funções `f(x)`, `g(x,y)`.
- **Ignorados:** espaços e `\,` `\;` `\:` `\!`  
- **Evite (causam erro):** `\left`/`\right`, `\big`/`\Big`, `\text{...}` e macros LaTeX não listadas acima.


### Passos de transformação implementados:
1. **Eliminação de** `→` e `↔`
2. **NNF** (negações empurradas até literais)
3. **Padronização** de variáveis ligadas (renomeação)
4. **Forma Prenex** (quantificadores no prefixo)
5. **Skolemização** (para CNF): remove `∃` usando constantes/funções de Skolem
6. **Distribuições:**  
   - OR sobre AND → **CNF**  
   - AND sobre OR → **DNF**
7. **Forma Cláusal** (lista de disjunções) e **checagem Horn**

> **Horn = SIM** se **todas** as cláusulas têm **no máximo 1 literal positivo**.


### Exemplos rápidos para testar:
Cole um por vez:

```latex
\neg (P \to Q) \lor R
(P \leftrightarrow Q) \land \neg R
(\neg P \lor Q) \land (Q \to R)
\forall x ( P(x) \to \exists y Q(y) )
\exists x \forall y ( R(x) \lor \neg S(y) )
\forall x \exists y ( P(f(x),y) \land \neg Q(g(y)) \to R(x) )
\forall x ((A(x) \land B(x)) \to C(x))
\forall x \exists y \forall z ( P(x,y) \to ( Q(y,z) \land R(f(x),z) ) )
(P \lor Q) \land (\neg Q \to R)
```

### Desenvolvedor
Guilherme Felippe Lazari

