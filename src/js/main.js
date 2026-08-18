import '../styles/main.css';

import * as stateMod from './state.js';
import * as utils from './utils.js';
import * as nav from './nav.js';
import * as modals from './modals.js';
import * as theme from './theme.js';

import * as budgets from './finance/budgets.js';
import * as expenses from './finance/expenses.js';
import * as cards from './finance/cards.js';
import * as bills from './finance/bills.js';
import * as savings from './finance/savings.js';
import * as debts from './finance/debts.js';
import * as assets from './finance/assets.js';
import * as income from './finance/income.js';
import * as summary from './finance/summary.js';

import * as calendar from './calendar.js';

import * as workouts from './health/workouts.js';
import * as metrics from './health/metrics.js';

import * as foods from './meals/foods.js';
import * as water from './meals/water.js';

import * as yearOverview from './year-overview.js';
import * as detailSheet from './detail-sheet.js';

import * as fbConfig from './firebase/config.js';
import * as fbAuth from './firebase/auth.js';
import * as fbSync from './firebase/sync.js';
import * as fbSettings from './firebase/settings.js';

import { initApp } from './init.js';

// The original app was a single inline <script> where every function lived in
// global scope, since the HTML calls them directly via onclick="fn()" and via
// closures built inside template strings (e.g. onclick="openCtx(event, () =>
// editExpense('${id}'), ...)"). ES modules are scoped, not global, so every
// exported function/value needs to land on window as a bridge. This is the
// only place that bridge exists — everything else uses normal ES imports.
const modules = [
  stateMod, utils, nav, modals, theme,
  budgets, expenses, cards, bills, savings, debts, assets, income, summary,
  calendar, workouts, metrics, foods, water, yearOverview, detailSheet,
  fbConfig, fbAuth, fbSync, fbSettings,
];
modules.forEach(ns => Object.assign(window, ns));

// Wrap mutating functions so every add/edit/delete auto-saves to localStorage
// + queues a Firebase sync. Must run after the Object.assign above so
// window[fnName] already resolves to the (toast-patched) function.
[
  'addBudgetCategory','addExpense','addSaving','updateSaving','addDebt','makePayment',
  'addAsset','updateAsset','addIncome','addBill','markBillPaid','removeBill',
  'addEvent','addWorkout','addFood','addCard','removeItem'
].forEach(fbSync.patchForSync);

initApp();
