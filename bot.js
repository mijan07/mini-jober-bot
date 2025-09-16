// ================== REQUIRED LIBRARIES ==================
const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');

// ================== CONFIGURATION (এখানে আপনার তথ্য দিন) ==================
// আপনার টেলিগ্রাম বটের টোকেন
const TELEGRAM_BOT_TOKEN = "7613053106:AAFPPH2n4c5AH13_XartbIg46d_diJzrLr8";

// আপনার ব্যক্তিগত টেলিগ্রাম ইউজার আইডি
const ADMIN_TELEGRAM_ID = 5079934473; 

// Firebase Admin SDK Configuration
// ডাউনলোড করা serviceAccountKey.json ফাইলটি এই bot.js ফাইলের পাশে রাখুন
const serviceAccount = require('./serviceAccountKey.json'); 
const FIREBASE_DATABASE_URL = "https://mini-jober-default-rtdb.asia-southeast1.firebasedatabase.app/";
// =======================================================================


// ================== INITIALIZATION ==================
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: FIREBASE_DATABASE_URL
});
const db = admin.database();
const auth = admin.auth();
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Multi-step conversation state management
let adminState = {};

console.log('✅ Admin Bot is running perfectly!');
console.log(`Listening for commands from Admin ID: ${ADMIN_TELEGRAM_ID}`);

// ================== MIDDLEWARE & MAIN HANDLER ==================
// Middleware to check if the user is the authorized admin
bot.on('message', (msg) => {
    if (msg.chat.id !== ADMIN_TELEGRAM_ID) {
        bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this bot.");
        return;
    }
});

// Main command and state handler
bot.on('message', async (msg) => {
    if (msg.chat.id !== ADMIN_TELEGRAM_ID) return;

    // If waiting for a specific input, handle it via the state machine
    if (adminState[msg.chat.id] && adminState[msg.chat.id].step) {
        await handleStatefulInput(msg);
        return;
    }
    
    // Handle main menu button presses
    handleMenuCommands(msg);
});


// ================== MENU & ROUTING ==================
function sendMainMenu(chatId) {
    adminState[chatId] = {}; // Clear any previous state
    bot.sendMessage(chatId, "👑 Welcome to the Admin Panel. Please choose an option:", {
        reply_markup: {
            keyboard: [
                ['➕ Add Task', '👀 Task Review'],
                ['💰 Balance Update', '📤 Pending Withdrawals'],
                ['📢 Broadcast', '🚫 Block/Unblock', '⚠️ Warn User'],
                ['⚙️ App Settings']
            ],
            resize_keyboard: true
        }
    });
}

function sendSettingsMenu(chatId) {
    bot.sendMessage(chatId, "⚙️ App Settings Menu:", {
        reply_markup: {
            keyboard: [
                ['🔔 Update Notice', '🔗 Update Support'],
                ['🖼️ Update Banner', '📅 Daily Reward'],
                ['💳 Withdraw Methods'],
                ['⬅️ Back to Main Menu']
            ],
            resize_keyboard: true
        }
    });
}

async function handleMenuCommands(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    switch (text) {
        case '/start':
        case '⬅️ Back to Main Menu': sendMainMenu(chatId); break;
        
        // Main Menu Options
        case '➕ Add Task': startAddTask(chatId); break;
        case '👀 Task Review': bot.sendMessage(chatId, "This feature is under development."); break; // Placeholder
        case '💰 Balance Update': startBalanceUpdate(chatId); break;
        case '📤 Pending Withdrawals': showPendingWithdrawals(chatId); break;
        case '📢 Broadcast': startBroadcast(chatId); break;
        case '🚫 Block/Unblock': startBlockUser(chatId); break;
        case '⚠️ Warn User': startWarnUser(chatId); break;
        case '⚙️ App Settings': sendSettingsMenu(chatId); break;

        // Settings Menu Options
        case '🔔 Update Notice': startUpdateNotice(chatId); break;
        case '🔗 Update Support': startUpdateSupport(chatId); break;
        case '🖼️ Update Banner': startUpdateBanner(chatId); break;
        case '📅 Daily Reward': startUpdateDailyReward(chatId); break;
        case '💳 Withdraw Methods': startWithdrawMethodUpdate(chatId); break;
    }
}

// ================== STATEFUL INPUT HANDLER ==================
async function handleStatefulInput(msg) {
    const chatId = msg.chat.id;
    const state = adminState[chatId];
    if (!state || !state.command) return;

    try {
        // Router for different multi-step commands
        const commandHandlers = {
            'addTask': handleAddTask, 'updateBalance': handleUpdateBalance, 'broadcast': handleBroadcast,
            'blockUser': handleBlockUser, 'warnUser': handleWarnUser, 'rejectWithdraw': handleRejectWithdraw,
            'updateNotice': handleUpdateNotice, 'updateSupport': handleUpdateSupport, 'updateBanner': handleUpdateBanner,
            'updateDailyReward': handleUpdateDailyReward, 'updateWithdrawMethod': handleUpdateWithdrawMethod
        };
        if (commandHandlers[state.command]) {
            await commandHandlers[state.command](msg, state);
        }
    } catch (error) {
        console.error("Error in stateful handler:", error);
        bot.sendMessage(chatId, `An error occurred: ${error.message}`);
        adminState[chatId] = {}; // Reset state on error
    }
}


// ================== FEATURE IMPLEMENTATIONS ==================

// --- Add Task ---
function startAddTask(chatId) {
    adminState[chatId] = { command: 'addTask', step: 'title', data: {} };
    bot.sendMessage(chatId, "📝 *Add New Task | Step 1 of 7*\n\nPlease send the task title.", { parse_mode: 'Markdown' });
}
async function handleAddTask(msg, state) {
    const chatId = msg.chat.id;
    const text = msg.text;

    switch (state.step) {
        case 'title':
            state.data.title = text; state.step = 'description';
            bot.sendMessage(chatId, "*Step 2 of 7*\n\nSend the task description.", { parse_mode: 'Markdown' });
            break;
        case 'description':
            state.data.description = text; state.step = 'link';
            bot.sendMessage(chatId, "*Step 3 of 7*\n\nSend the task link (e.g., https://example.com).", { parse_mode: 'Markdown' });
            break;
        case 'link':
            state.data.link = text; state.step = 'reward';
            bot.sendMessage(chatId, "*Step 4 of 7*\n\nHow many points for this task?", { parse_mode: 'Markdown' });
            break;
        case 'reward':
            state.data.reward = parseInt(text); state.step = 'maxUsers';
            bot.sendMessage(chatId, "*Step 5 of 7*\n\nHow many users can complete this task?", { parse_mode: 'Markdown' });
            break;
        case 'maxUsers':
            state.data.maxUsers = parseInt(text); state.step = 'requireTextProof';
            bot.sendMessage(chatId, "*Step 6 of 7*\n\nNeed text proof?", { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: 'Yes', callback_data: 'addTask_textProof_yes' }, { text: 'No', callback_data: 'addTask_textProof_no' }]] } });
            break;
        case 'screenshotCount':
            state.data.screenshotCount = parseInt(text);
            const newTask = { ...state.data, createdAt: Date.now(), usersCompleted: 0 };
            await db.ref('tasks').push(newTask);
            bot.sendMessage(chatId, "✅ Task added successfully!");
            sendMainMenu(chatId);
            break;
    }
}

// --- Update User Balance ---
function startBalanceUpdate(chatId) {
    adminState[chatId] = { command: 'updateBalance', step: 'email' };
    bot.sendMessage(chatId, "💰 *Update User Balance*\n\nPlease enter the user's email address.", { parse_mode: 'Markdown' });
}
async function handleUpdateBalance(msg, state) {
    const chatId = msg.chat.id; const text = msg.text;
    if (state.step === 'email') {
        try {
            const user = await auth.getUserByEmail(text);
            state.uid = user.uid; state.step = 'amount';
            bot.sendMessage(chatId, `User found: ${user.email}. Now enter the new total balance.`);
        } catch (e) { bot.sendMessage(chatId, "❌ User not found. Please try again."); }
    } else if (state.step === 'amount') {
        const newBalance = parseFloat(text);
        if (isNaN(newBalance)) return bot.sendMessage(chatId, "Invalid amount.");
        await db.ref(`users/${state.uid}`).update({ balance: newBalance });
        bot.sendMessage(chatId, `✅ User's balance updated to ${newBalance}.`);
        sendMainMenu(chatId);
    }
}

// --- Broadcast ---
function startBroadcast(chatId) {
    adminState[chatId] = { command: 'broadcast', step: 'message' };
    bot.sendMessage(chatId, "📢 *Broadcast Message*\n\nType the message to send to ALL users.", { parse_mode: 'Markdown' });
}
async function handleBroadcast(msg) {
    const usersSnap = await db.ref('users').once('value');
    let count = 0;
    if (usersSnap.exists()) {
        for (const uid in usersSnap.val()) {
            db.ref(`users/${uid}/notifications`).push({ message: msg.text, timestamp: Date.now(), read: false });
            count++;
        }
    }
    bot.sendMessage(msg.chat.id, `✅ Broadcast sent to ${count} users.`);
    sendMainMenu(msg.chat.id);
}

// --- Block/Unblock User ---
function startBlockUser(chatId) {
    adminState[chatId] = { command: 'blockUser', step: 'email' };
    bot.sendMessage(chatId, "🚫 *Block/Unblock User*\n\nPlease enter the user's email address.", { parse_mode: 'Markdown' });
}
async function handleBlockUser(msg, state) {
    const chatId = msg.chat.id; const text = msg.text;
    if (state.step === 'email') {
        try {
            const user = await auth.getUserByEmail(text);
            state.uid = user.uid; state.step = 'reason';
            bot.sendMessage(chatId, `User found. Please provide a reason for this action (e.g., 'Violated terms').`);
        } catch (e) { bot.sendMessage(chatId, "❌ User not found."); }
    } else if (state.step === 'reason') {
        state.reason = text;
        bot.sendMessage(chatId, `Reason: "${text}". Choose an action:`, {
            reply_markup: { inline_keyboard: [[{ text: 'Block', callback_data: 'block_user' }, { text: 'Unblock', callback_data: 'unblock_user' }]] }
        });
    }
}

// --- Warn User ---
function startWarnUser(chatId) {
    adminState[chatId] = { command: 'warnUser', step: 'email' };
    bot.sendMessage(chatId, "⚠️ *Warn User*\n\nPlease enter the user's email address.", { parse_mode: 'Markdown' });
}
async function handleWarnUser(msg, state) {
    const chatId = msg.chat.id; const text = msg.text;
    if (state.step === 'email') {
        try {
            const user = await auth.getUserByEmail(text);
            state.uid = user.uid; state.step = 'message';
            bot.sendMessage(chatId, `User found. Type the warning message to send.`);
        } catch (e) { bot.sendMessage(chatId, "❌ User not found."); }
    } else if (state.step === 'message') {
        await db.ref(`users/${state.uid}/warnings`).push({ message: text, timestamp: Date.now() });
        bot.sendMessage(chatId, `✅ Warning sent to the user.`);
        sendMainMenu(chatId);
    }
}

// --- Withdrawal Management ---
async function showPendingWithdrawals(chatId) {
    const snap = await db.ref('withdrawals').orderByChild('status').equalTo('pending').once('value');
    if (!snap.exists()) return bot.sendMessage(chatId, "No pending withdrawal requests.");
    
    snap.forEach((child) => {
        const key = child.key; const data = child.val();
        const message = `*Request from:* \`${data.email}\`\n*Amount:* ${data.amount} BDT\n*Method:* ${data.method}\n*Address:* \`${data.address}\``;
        bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '✅ Approve', callback_data: `withdraw_approve_${key}` }, { text: '❌ Reject', callback_data: `withdraw_reject_${key}` }]] }
        });
    });
}
async function handleRejectWithdraw(msg, state) {
    const reason = msg.text;
    const snap = await db.ref(`withdrawals/${state.key}`).once('value');
    const data = snap.val();
    await db.ref(`withdrawals/${state.key}`).update({ status: 'rejected', reason: reason });
    await db.ref(`users/${data.uid}/balance`).transaction(bal => (bal || 0) + data.amount);
    bot.sendMessage(msg.chat.id, `✅ Withdrawal rejected and balance refunded.`);
    sendMainMenu(msg.chat.id);
}

// --- Settings Updaters ---
function startUpdateNotice(chatId) { adminState[chatId] = { command: 'updateNotice', step: 'text' }; bot.sendMessage(chatId, "🔔 Send the new notice text."); }
async function handleUpdateNotice(msg) { await db.ref('settings').update({ notice: msg.text }); bot.sendMessage(msg.chat.id, "✅ Notice updated."); sendMainMenu(msg.chat.id); }

function startUpdateSupport(chatId) { adminState[chatId] = { command: 'updateSupport', step: 'text' }; bot.sendMessage(chatId, "🔗 Send the new support text/link."); }
async function handleUpdateSupport(msg) { await db.ref('settings').update({ support: msg.text }); bot.sendMessage(msg.chat.id, "✅ Support info updated."); sendMainMenu(msg.chat.id); }

function startUpdateDailyReward(chatId) { adminState[chatId] = { command: 'updateDailyReward', step: 'amount' }; bot.sendMessage(chatId, "📅 Send the new daily check-in reward amount."); }
async function handleUpdateDailyReward(msg) { await db.ref('settings').update({ dailyReward: parseInt(msg.text) }); bot.sendMessage(msg.chat.id, "✅ Daily reward updated."); sendMainMenu(msg.chat.id); }

function startUpdateBanner(chatId) { adminState[chatId] = { command: 'updateBanner', step: 'imageUrl', data: {} }; bot.sendMessage(chatId, "🖼️ *Update Banner*\n\nFirst, upload your banner image to a site like [imgbb.com](https://imgbb.com) and send me the **direct image URL**.", { parse_mode: 'Markdown' }); }
async function handleUpdateBanner(msg, state) {
    if (state.step === 'imageUrl') {
        state.data.imageUrl = msg.text; state.step = 'link';
        bot.sendMessage(msg.chat.id, "Great! Now send the clickable link for this banner.");
    } else if (state.step === 'link') {
        state.data.link = msg.text;
        await db.ref('settings/banners').push(state.data);
        bot.sendMessage(msg.chat.id, "✅ Banner added successfully!");
        sendMainMenu(msg.chat.id);
    }
}

function startWithdrawMethodUpdate(chatId) { adminState[chatId] = { command: 'updateWithdrawMethod', step: 'name', data: {} }; bot.sendMessage(chatId, "💳 *Add Withdraw Method*\n\nSend the payment method name (e.g., Bkash, Nagad).", { parse_mode: 'Markdown' }); }
async function handleUpdateWithdrawMethod(msg, state) {
    if (state.step === 'name') {
        state.data.name = msg.text; state.step = 'min';
        bot.sendMessage(msg.chat.id, `OK. Now send the minimum withdrawal amount for ${msg.text}.`);
    } else if (state.step === 'min') {
        state.data.minWithdraw = parseFloat(msg.text);
        await db.ref('settings/withdrawMethods').push(state.data);
        bot.sendMessage(msg.chat.id, "✅ New withdrawal method added!");
        sendMainMenu(msg.chat.id);
    }
}


// ================== INLINE KEYBOARD HANDLER ==================
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (chatId !== ADMIN_TELEGRAM_ID) return;
    bot.answerCallbackQuery(query.id);
    const [command, action, key] = query.data.split('_');
    const state = adminState[chatId];

    if (command === 'addTask' && action === 'textProof') {
        state.data.requireTextProof = (key === 'yes'); state.step = 'screenshotCount';
        bot.editMessageText("*Step 7 of 7*\n\nHow many screenshots needed? (Enter 0 if none)", { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown' });
    }

    if (command === 'block' || command === 'unblock') {
        const isBlocked = command === 'block';
        await db.ref(`users/${state.uid}`).update({ isBlocked: isBlocked, blockReason: isBlocked ? state.reason : "" });
        bot.editMessageText(`✅ User has been ${isBlocked ? 'BLOCKED' : 'UNBLOCKED'}.`, { chat_id: chatId, message_id: query.message.message_id });
        sendMainMenu(chatId);
    }

    if (command === 'withdraw') {
        if(action === 'approve') {
            await db.ref(`withdrawals/${key}`).update({ status: 'approved' });
            bot.editMessageText(`✅ Request approved.`, { chat_id: chatId, message_id: query.message.message_id });
        } else if (action === 'reject') {
            adminState[chatId] = { command: 'rejectWithdraw', step: 'reason', key: key };
            bot.sendMessage(chatId, `Please provide a reason for rejecting this withdrawal.`);
            bot.deleteMessage(chatId, query.message.message_id);
        }
    }
});