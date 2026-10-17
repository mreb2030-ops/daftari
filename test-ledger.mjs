import * as L from '../www/js/ledger.js';
import assert from 'node:assert/strict';
const S = L.defaultState();
S.accounts.find(a=>a.id==='a_cash').opening = 500;
S.accounts.find(a=>a.id==='a_bank').opening = 10000;
S.accounts.push({id:'car',name:'السيارة',kind:'asset',opening:40000},{id:'loan',name:'قرض السيارة',kind:'liab',opening:20000},{id:'card',name:'بطاقة',kind:'liab',opening:0});
let n=0; const T=(o)=>S.tx.push({id:'t'+(++n),ts:n,...o});
T({type:'rev',date:'2026-10-01',amt:12000,acc:'a_bank',cat:'r0'});
T({type:'exp',date:'2026-10-02',amt:3500,acc:'a_bank',cat:'e0'});
T({type:'pur',date:'2026-10-03',amt:300,acc:'a_cash',cat:'p0'});
T({type:'pur',date:'2026-10-04',amt:2000,acc:'card',cat:'p3'});          // آجل
T({type:'pur',date:'2026-10-05',amt:5000,acc:'a_bank',to:'car'});        // شراء أصل
T({type:'trf',date:'2026-10-06',amt:1000,acc:'a_bank',to:'a_cash'});
T({type:'bor',date:'2026-10-07',amt:4000,acc:'loan',to:'a_bank'});
T({type:'pay',date:'2026-10-20',amt:1500,acc:'a_bank',to:'loan'});
T({type:'exp',date:'2026-09-15',amt:100,acc:'a_cash',cat:'e1'});
const bal=L.balances(S);
console.log(bal);
const bs=L.balanceSheet(S,'2026-12-31');
assert.equal(bs.equity, bs.equityCheck, 'equity identity');
const r=L.periodRange({mode:'month',y:2026,m:10});
const cf=L.cashFlow(S,r);
const liquid=bal.a_cash+bal.a_bank;
// أيلول فيه مصروف 100 قبل الفترة، لذا الإغلاق = رصيد السيولة الحالي
assert.equal(cf.closing, L.r2(liquid), 'cashflow closing = liquid balances');
const is=L.incomeStatement(S,r);
assert.equal(is.net, 12000-300-2000-3500);
const st=L.accountStatement(S,'a_bank',r);
assert.equal(st.closing, bal.a_bank);
assert.equal(L.validateTx(S,{type:'rev',date:'2026-10-01',amt:5,acc:'loan',cat:'r0'}),'يُودَع الإيراد في صندوق أو بنك.');
assert.ok(L.shortfall(S,{type:'exp',amt:999999,acc:'a_cash'})>0);
console.log('net',is.net,'equity',bs.equity,'cf',cf);
console.log('ALL OK');
