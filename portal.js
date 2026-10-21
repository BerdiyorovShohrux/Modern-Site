/* Real member sessions, private/general chat and administrator controls. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const strings = {
    uz: {
      workspace:'A’zolar maydoni', chat:'Chat', admin:'Admin panel', profile:'Hisobim', chatTitle:'Birga. Bir maydonda.', adminTitle:'Boshqaruv markazi.', profileTitle:'Sizning hisobingiz.', close:'Yopish', logout:'Chiqish', roleAdmin:'Administrator', roleUser:'Ishtirokchi', rooms:'Suhbatlar', general:'Umumiy suhbat', generalHint:'Barcha ruxsat berilgan foydalanuvchilar uchun', privateHint:'Faqat siz va suhbatdoshingiz ko‘radi', members:'ishtirokchi', roomLabel:'Suhbat', connected:'Ulangan', connecting:'Qayta ulanmoqda', offline:'Ulanish kutilmoqda', loading:'Yuklanmoqda…', emptyTitle:'Suhbat shu yerdan boshlanadi.', emptyHint:'Birinchi xabarni yozing. Yaxshi g‘oyalar muloqotdan boshlanadi.', older:'Oldingi xabarlar', messagePlaceholder:'Xabaringizni yozing…', send:'Yuborish', composeHint:'Enter — yuborish · Shift + Enter — yangi qator', delete:'O‘chirish', deleteConfirm:'Ushbu xabarni barcha uchun o‘chirasizmi?', you:'Siz', messageRemoved:'Xabar o‘chirildi.', profileArt:'O‘z maydoningiz. O‘z uslubingiz.', passwordTitle:'Parolni yangilash', passwordIntro:'Shaxsiy hisobingizni boshqaring. Yangi parol kamida 12 ta belgidan iborat bo‘lsin.', requiredPassword:'Hisobingiz uchun yangi parol tanlang. Chat va boshqa bo‘limlar parol yangilangach ochiladi.', currentPassword:'Hozirgi parol', newPassword:'Yangi parol', confirmPassword:'Yangi parolni takrorlang', passwordHint:'12–128 ta belgi. Har bir hisob uchun alohida parol ishlating.', show:'Ko‘rsatish', hide:'Yashirish', updatePassword:'Parolni yangilash', passwordUpdated:'Parol yangilandi. Endi barcha ruxsat etilgan bo‘limlardan foydalanishingiz mumkin.', passwordMismatch:'Yangi parollar bir xil emas.', passwordSame:'Yangi parol hozirgi paroldan farq qilishi kerak.', totalUsers:'Jami hisoblar', activeUsers:'Faol hisoblar', totalMessages:'Jami xabarlar', userDirectory:'Foydalanuvchilar', addUser:'User qo‘shish', searchUsers:'Ism yoki login orqali qidirish…', noUsers:'Foydalanuvchi topilmadi.', active:'Faol', inactive:'Yopiq', createTitle:'Yangi foydalanuvchi', editTitle:'Hisobni tahrirlash', username:'Login', displayName:'Ko‘rinadigan ism', initialPassword:'Boshlang‘ich parol', usernameHint:'3–32 ta belgi: harflar, raqamlar, nuqta, _ yoki -.', createUser:'Hisob yaratish', saveUser:'O‘zgarishlarni saqlash', accessEnabled:'Saytga kirish ruxsat etilgan', resetTitle:'Parolni qayta o‘rnatish', resetHint:'Foydalanuvchi qayta kiradi va yangi parol tanlaydi.', resetPassword:'Yangi parol o‘rnatish', selfPasswordHint:'O‘z parolingizni “Hisobim” bo‘limida yangilang.', userCreated:'Hisob yaratildi. Login va boshlang‘ich parolni foydalanuvchiga shaxsan yetkazing.', userSaved:'Hisob ma’lumotlari saqlandi.', passwordReset:'Parol qayta o‘rnatildi. Foydalanuvchi yangi parol tanlashi kerak.', createHint:'Yangi hisob birinchi kirishda parolini almashtiradi.', networkError:'Server bilan bog‘lanib bo‘lmadi. Ulanishni tekshirib, qayta urinib ko‘ring.', retry:'Qayta urinish', genericError:'Amal bajarilmadi. Qayta urinib ko‘ring.', saving:'Saqlanmoqda…', sessionExpired:'Sessiya tugadi. Qayta kiring.', roomUnavailable:'Suhbatdoshingiz hozir mavjud emas. Umumiy suhbat ochildi.', selectUser:'Tahrirlash uchun foydalanuvchini tanlang.', passwordLength:'Parol 12–128 ta belgidan iborat bo‘lishi kerak.', invalidUsername:'Login 3–32 ta harf, raqam, nuqta, _ yoki - dan iborat bo‘lsin.', invalidName:'Ism 1–80 ta belgidan iborat bo‘lsin.', usernameTaken:'Bu login band. Boshqa login tanlang.', invalidCredentials:'Login yoki parol noto‘g‘ri.', wrongPassword:'Hozirgi parol noto‘g‘ri.', denied:'Bu amal uchun ruxsat yo‘q.', rateLimited:'Juda ko‘p urinish. Birozdan keyin yana urinib ko‘ring.', invalidMessage:'1–2000 ta belgidan iborat xabar yozing.', ownAccount:'O‘z admin hisobingizni yopib bo‘lmaydi.', roomUpdated:'Suhbatlar ro‘yxati yangilandi.', refresh:'Yangilash', dateToday:'Bugun', unread:'o‘qilmagan xabar', userRole:'User', adminRole:'Admin'
    },
    ru: {
      workspace:'Пространство участников', chat:'Чат', admin:'Админ-панель', profile:'Мой аккаунт', chatTitle:'Вместе. В одном месте.', adminTitle:'Центр управления.', profileTitle:'Ваш аккаунт.', close:'Закрыть', logout:'Выйти', roleAdmin:'Администратор', roleUser:'Участник', rooms:'Разговоры', general:'Общий чат', generalHint:'Для всех участников с доступом', privateHint:'Видите только вы и ваш собеседник', members:'участников', roomLabel:'Разговор', connected:'Подключено', connecting:'Переподключение', offline:'Ожидание подключения', loading:'Загрузка…', emptyTitle:'Разговор начинается здесь.', emptyHint:'Напишите первое сообщение. Хорошие идеи начинаются с общения.', older:'Предыдущие сообщения', messagePlaceholder:'Напишите сообщение…', send:'Отправить', composeHint:'Enter — отправить · Shift + Enter — новая строка', delete:'Удалить', deleteConfirm:'Удалить это сообщение для всех?', you:'Вы', messageRemoved:'Сообщение удалено.', profileArt:'Ваше пространство. Ваш стиль.', passwordTitle:'Обновить пароль', passwordIntro:'Управляйте своим аккаунтом. Новый пароль должен содержать не менее 12 символов.', requiredPassword:'Выберите новый пароль для аккаунта. Чат и другие разделы откроются после его изменения.', currentPassword:'Текущий пароль', newPassword:'Новый пароль', confirmPassword:'Повторите новый пароль', passwordHint:'12–128 символов. Используйте отдельный пароль для каждого аккаунта.', show:'Показать', hide:'Скрыть', updatePassword:'Обновить пароль', passwordUpdated:'Пароль обновлён. Теперь доступны все разрешённые разделы.', passwordMismatch:'Новые пароли не совпадают.', passwordSame:'Новый пароль должен отличаться от текущего.', totalUsers:'Всего аккаунтов', activeUsers:'Активные аккаунты', totalMessages:'Всего сообщений', userDirectory:'Пользователи', addUser:'Добавить', searchUsers:'Поиск по имени или логину…', noUsers:'Пользователь не найден.', active:'Активен', inactive:'Закрыт', createTitle:'Новый пользователь', editTitle:'Редактировать аккаунт', username:'Логин', displayName:'Отображаемое имя', initialPassword:'Начальный пароль', usernameHint:'3–32 символа: буквы, цифры, точка, _ или -.', createUser:'Создать аккаунт', saveUser:'Сохранить изменения', accessEnabled:'Доступ к сайту разрешён', resetTitle:'Сбросить пароль', resetHint:'Пользователь войдёт заново и выберет новый пароль.', resetPassword:'Установить пароль', selfPasswordHint:'Измените свой пароль в разделе «Мой аккаунт».', userCreated:'Аккаунт создан. Передайте логин и начальный пароль пользователю лично.', userSaved:'Данные аккаунта сохранены.', passwordReset:'Пароль сброшен. Пользователь должен выбрать новый пароль.', createHint:'При первом входе пользователь изменит начальный пароль.', networkError:'Не удалось подключиться к серверу. Проверьте соединение и повторите попытку.', retry:'Повторить', genericError:'Не удалось выполнить действие. Попробуйте ещё раз.', saving:'Сохранение…', sessionExpired:'Сессия истекла. Войдите снова.', roomUnavailable:'Собеседник сейчас недоступен. Открыт общий чат.', selectUser:'Выберите пользователя для редактирования.', passwordLength:'Пароль должен содержать 12–128 символов.', invalidUsername:'Логин: 3–32 буквы, цифры, точка, _ или -.', invalidName:'Имя должно содержать 1–80 символов.', usernameTaken:'Этот логин занят. Выберите другой.', invalidCredentials:'Неверный логин или пароль.', wrongPassword:'Текущий пароль неверен.', denied:'Недостаточно прав для этого действия.', rateLimited:'Слишком много попыток. Попробуйте немного позже.', invalidMessage:'Напишите сообщение длиной 1–2000 символов.', ownAccount:'Нельзя закрыть собственный аккаунт администратора.', roomUpdated:'Список разговоров обновлён.', refresh:'Обновить', dateToday:'Сегодня', unread:'непрочитанных сообщений', userRole:'Участник', adminRole:'Админ'
    },
    en: {
      workspace:'Members workspace', chat:'Chat', admin:'Admin panel', profile:'My account', chatTitle:'Together. In one place.', adminTitle:'The control room.', profileTitle:'Your account.', close:'Close', logout:'Log out', roleAdmin:'Administrator', roleUser:'Member', rooms:'Conversations', general:'General conversation', generalHint:'For all members with access', privateHint:'Only you and your conversation partner can see this', members:'members', roomLabel:'Conversation', connected:'Connected', connecting:'Reconnecting', offline:'Waiting for connection', loading:'Loading…', emptyTitle:'A conversation starts here.', emptyHint:'Write the first message. Good ideas start with a conversation.', older:'Earlier messages', messagePlaceholder:'Write your message…', send:'Send', composeHint:'Enter to send · Shift + Enter for a new line', delete:'Delete', deleteConfirm:'Delete this message for everyone?', you:'You', messageRemoved:'Message deleted.', profileArt:'Your space. Your perspective.', passwordTitle:'Update your password', passwordIntro:'Manage your personal account. Choose a new password with at least 12 characters.', requiredPassword:'Choose a new password for your account. Chat and other sections become available after you update it.', currentPassword:'Current password', newPassword:'New password', confirmPassword:'Repeat new password', passwordHint:'12–128 characters. Use a different password for every account.', show:'Show', hide:'Hide', updatePassword:'Update password', passwordUpdated:'Password updated. All permitted sections are now available.', passwordMismatch:'The new passwords do not match.', passwordSame:'Your new password must differ from the current one.', totalUsers:'Total accounts', activeUsers:'Active accounts', totalMessages:'Total messages', userDirectory:'Users', addUser:'Add user', searchUsers:'Search by name or username…', noUsers:'No users found.', active:'Active', inactive:'Closed', createTitle:'Create a user', editTitle:'Edit account', username:'Username', displayName:'Display name', initialPassword:'Initial password', usernameHint:'3–32 characters: letters, digits, period, _ or -.', createUser:'Create account', saveUser:'Save changes', accessEnabled:'Access to the site is enabled', resetTitle:'Reset password', resetHint:'The user will sign in again and choose a new password.', resetPassword:'Set new password', selfPasswordHint:'Change your own password in My account.', userCreated:'Account created. Share the username and initial password with the user privately.', userSaved:'Account changes saved.', passwordReset:'Password reset. The user must choose a new password.', createHint:'New users change their initial password on first sign-in.', networkError:'Unable to reach the server. Check your connection and try again.', retry:'Try again', genericError:'The action could not be completed. Please try again.', saving:'Saving…', sessionExpired:'Your session has expired. Please sign in again.', roomUnavailable:'Your conversation partner is unavailable. The general conversation is open.', selectUser:'Select a user to edit their account.', passwordLength:'The password must contain 12–128 characters.', invalidUsername:'Use 3–32 letters, digits, periods, _ or - for the username.', invalidName:'The name must contain 1–80 characters.', usernameTaken:'This username is taken. Choose another one.', invalidCredentials:'Incorrect username or password.', wrongPassword:'Your current password is incorrect.', denied:'You do not have permission for this action.', rateLimited:'Too many attempts. Please try again shortly.', invalidMessage:'Write a message containing 1–2000 characters.', ownAccount:'You cannot close your own administrator account.', roomUpdated:'Conversation list updated.', refresh:'Refresh', dateToday:'Today', unread:'unread messages', userRole:'Member', adminRole:'Admin'
    }
  };
  const lang = () => ['uz','ru','en'].includes(window.SiteI18n?.language) ? window.SiteI18n.language : 'uz';
  const t = key => strings[lang()][key] || strings.en[key] || key;
  const state = {user:null,csrfToken:'',members:[],room:'all',messages:new Map(),hasMore:false,roomVersion:0,loadingMessages:false,eventSource:null,connection:'offline',currentTab:'chat',unread:new Map(),adminUsers:[],selectedUser:null,creating:false,adminLoaded:false,changingPassword:false,lastTrigger:null};
  const dialog = document.createElement('dialog');
  dialog.id = 'member-dialog';
  dialog.dataset.i18nSkip = '';
  dialog.setAttribute('aria-labelledby','member-title');
  // All interpolation below is static markup. User data is assigned with textContent/value.
  dialog.innerHTML = `
    <div class="member-shell">
      <header class="member-heading"><div class="member-heading-copy"><span class="member-eyebrow" data-m-text="workspace"></span><h2 class="member-title" id="member-title"></h2></div><div class="member-heading-actions"><div class="member-person"><span id="member-person-name"></span><small id="member-person-role"></small></div><button class="member-close" type="button" data-m-aria="close">×</button></div></header>
      <nav class="member-tabs" role="tablist" aria-label="Member workspace"><button class="member-tab" type="button" role="tab" id="member-tab-chat" aria-controls="member-panel-chat" data-tab="chat" data-m-text="chat"></button><button class="member-tab" type="button" role="tab" id="member-tab-admin" aria-controls="member-panel-admin" data-tab="admin" data-m-text="admin" hidden></button><button class="member-tab" type="button" role="tab" id="member-tab-profile" aria-controls="member-panel-profile" data-tab="profile" data-m-text="profile"></button><button class="member-signout" type="button" data-m-text="logout"></button></nav>
      <div class="member-panels">
        <section class="member-panel member-chat-panel" id="member-panel-chat" role="tabpanel" aria-labelledby="member-tab-chat">
          <aside class="member-rooms"><p class="member-room-label" data-m-text="rooms"></p><div class="member-room-list"></div><div class="member-room-footer"></div></aside>
          <div class="member-conversation"><header class="member-chat-top"><div><h3 class="member-chat-title"></h3><p class="member-chat-description"></p></div><span class="member-connection" role="status"></span></header><div class="member-mobile-room"><label><span data-m-text="roomLabel"></span><select aria-label="Conversation"></select></label></div><p class="member-notice member-chat-status" role="status" hidden></p><div class="member-message-scroll"><div class="member-older-wrap" hidden><button type="button" class="member-older" data-m-text="older"></button></div><div class="member-messages" aria-live="polite" aria-relevant="additions text"></div></div><form class="member-composer"><label class="sr-only" for="member-message" data-m-text="messagePlaceholder"></label><div class="member-compose-row"><textarea id="member-message" name="message" rows="1" maxlength="2000" required data-m-placeholder="messagePlaceholder"></textarea><button class="member-send" type="submit" data-m-text="send"></button></div><div class="member-compose-hint"><span data-m-text="composeHint"></span><span class="member-char-count">0 / 2000</span></div></form></div>
        </section>
        <section class="member-panel member-admin-panel" id="member-panel-admin" role="tabpanel" aria-labelledby="member-tab-admin" hidden>
          <div class="member-stats"><div class="member-stat"><span data-m-text="totalUsers"></span><strong id="member-stat-total">—</strong></div><div class="member-stat"><span data-m-text="activeUsers"></span><strong id="member-stat-active">—</strong></div><div class="member-stat"><span data-m-text="totalMessages"></span><strong id="member-stat-messages">—</strong></div></div>
          <div class="member-admin-toolbar"><h3 data-m-text="userDirectory"></h3><button class="member-primary member-add-user" type="button" data-m-text="addUser"></button></div><p class="member-notice member-admin-status" role="status" hidden></p>
          <div class="member-admin-layout"><div class="member-admin-directory"><label class="sr-only" for="member-user-search" data-m-text="searchUsers"></label><input class="member-admin-search" id="member-user-search" type="search" data-m-placeholder="searchUsers"><div class="member-admin-list"></div></div><div class="member-admin-editor"><h4 id="member-editor-title"></h4><form class="member-user-form member-form"><label class="member-field"><span data-m-text="username"></span><input name="username" type="text" minlength="3" maxlength="32" pattern="[a-zA-Z0-9_.\\-]{3,32}" autocomplete="off" required spellcheck="false"><small data-m-text="usernameHint"></small></label><label class="member-field"><span data-m-text="displayName"></span><input name="displayName" type="text" maxlength="80" required autocomplete="off"></label><label class="member-field member-create-password"><span data-m-text="initialPassword"></span><span class="member-password-row"><input name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password"><button type="button" class="member-password-toggle" data-password-toggle data-m-text="show"></button></span><small data-m-text="createHint"></small></label><label class="member-toggle-field member-active-field"><input type="checkbox" name="active"><span data-m-text="accessEnabled"></span></label><button class="member-primary member-save-user" type="submit"></button></form><section class="member-reset-section"><h5 data-m-text="resetTitle"></h5><form class="member-reset-form member-form"><label class="member-field"><span data-m-text="newPassword"></span><span class="member-password-row"><input name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password" required><button type="button" class="member-password-toggle" data-password-toggle data-m-text="show"></button></span><small data-m-text="resetHint"></small></label><button class="member-secondary" type="submit" data-m-text="resetPassword"></button></form><p class="member-small-note member-self-password-note" data-m-text="selfPasswordHint" hidden></p></section></div></div>
        </section>
        <section class="member-panel member-profile-panel" id="member-panel-profile" role="tabpanel" aria-labelledby="member-tab-profile" hidden><div class="member-profile-grid"><div class="member-profile-art" aria-hidden="true"><small>W. / MEMBERS</small><span class="member-big-letter">W.</span><p data-m-text="profileArt"></p></div><div class="member-profile-form"><h3 data-m-text="passwordTitle"></h3><p class="member-profile-intro" data-m-text="passwordIntro"></p><p class="member-required" data-m-text="requiredPassword" hidden></p><form class="member-password-form member-form"><label class="member-field"><span data-m-text="currentPassword"></span><span class="member-password-row"><input name="currentPassword" type="password" autocomplete="current-password" maxlength="128" required><button type="button" class="member-password-toggle" data-password-toggle data-m-text="show"></button></span></label><label class="member-field"><span data-m-text="newPassword"></span><span class="member-password-row"><input name="newPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><button type="button" class="member-password-toggle" data-password-toggle data-m-text="show"></button></span><small data-m-text="passwordHint"></small></label><label class="member-field"><span data-m-text="confirmPassword"></span><span class="member-password-row"><input name="confirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><button type="button" class="member-password-toggle" data-password-toggle data-m-text="show"></button></span></label><button class="member-primary" type="submit" data-m-text="updatePassword"></button></form><p class="member-notice member-profile-status" role="status" hidden></p></div></div></section>
      </div>
    </div>`;
  document.body.append(dialog);
  const ui = {
    roomList:$('.member-room-list',dialog),roomSelect:$('.member-mobile-room select',dialog),messages:$('.member-messages',dialog),scroll:$('.member-message-scroll',dialog),older:$('.member-older-wrap',dialog),chatStatus:$('.member-chat-status',dialog),adminStatus:$('.member-admin-status',dialog),profileStatus:$('.member-profile-status',dialog),message:$('#member-message',dialog),composer:$('.member-composer',dialog),userForm:$('.member-user-form',dialog),resetForm:$('.member-reset-form',dialog),passwordForm:$('.member-password-form',dialog)
  };
  function status(element,message,error=false){element.textContent=message;element.hidden=!message;element.classList.toggle('is-error',error);}
  function errorText(error){
    const codes={NETWORK:'networkError',USERNAME_TAKEN:'usernameTaken',USERNAME_EXISTS:'usernameTaken',INVALID_USERNAME:'invalidUsername',INVALID_DISPLAY_NAME:'invalidName',INVALID_PASSWORD:'passwordLength',PASSWORD_TOO_SHORT:'passwordLength',INVALID_CREDENTIALS:'invalidCredentials',INCORRECT_PASSWORD:'wrongPassword',WRONG_PASSWORD:'wrongPassword',CURRENT_PASSWORD_INVALID:'wrongPassword',FORBIDDEN:'denied',CSRF_INVALID:'denied',INVALID_CSRF:'denied',RATE_LIMITED:'rateLimited',MESSAGE_INVALID:'invalidMessage',INVALID_MESSAGE:'invalidMessage',CANNOT_DISABLE_SELF:'ownAccount',SELF_DISABLE:'ownAccount',PASSWORD_CHANGE_REQUIRED:'requiredPassword',UNAUTHORIZED:'sessionExpired'};
    return t(codes[error?.code]||'genericError');
  }
  function redirectLogin(){stopEvents();window.location.assign('/login?expired=1');}
  async function api(path,options={}){
    const init={...options,credentials:'same-origin',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.method&&options.method!=='GET'?{'X-CSRF-Token':state.csrfToken}:{}),...options.headers}};
    let response;
    try{response=await fetch(path,init);}catch{throw Object.assign(new Error('Network error'),{code:'NETWORK'});}
    let data;
    try{data=await response.json();}catch{throw Object.assign(new Error('Invalid server response'),{code:'NETWORK'});}
    if(!response.ok){
      const error=Object.assign(new Error(data?.error?.message||'Request failed'),{code:data?.error?.code||'UNKNOWN',status:response.status});
      if(response.status===401){redirectLogin();}
      if(error.code==='PASSWORD_CHANGE_REQUIRED'&&state.user){state.user.mustChangePassword=true;queueMicrotask(()=>open('profile'));}
      throw error;
    }
    if(data?.csrfToken)state.csrfToken=data.csrfToken;
    return data;
  }
  function translate(){
    dialog.lang=lang();
    $$('[data-m-text]',dialog).forEach(element=>{element.textContent=t(element.dataset.mText);});
    $$('[data-m-placeholder]',dialog).forEach(element=>{element.placeholder=t(element.dataset.mPlaceholder);});
    $$('[data-m-aria]',dialog).forEach(element=>element.setAttribute('aria-label',t(element.dataset.mAria)));
    ui.roomSelect.setAttribute('aria-label',t('roomLabel'));
    $('.member-tabs',dialog).setAttribute('aria-label',t('workspace'));
    $$('[data-password-toggle]',dialog).forEach(button=>{const shown=$('input',button.parentElement).type==='text';button.textContent=t(shown?'hide':'show');button.setAttribute('aria-pressed',String(shown));});
    renderIdentity();renderRooms();renderMessages({preserveScroll:true});renderConnection();renderAdminList();renderEditorLabels();
  }
  function renderIdentity(){
    if(!state.user)return;
    $('#member-person-name',dialog).textContent=state.user.displayName;
    $('#member-person-role',dialog).textContent=t(state.user.role==='admin'?'roleAdmin':'roleUser');
    const name=$('#member-name');if(name){name.dataset.i18nSkip='';name.textContent=state.user.displayName;}
    $$('[data-member-open="admin"]').forEach(button=>{button.hidden=state.user.role!=='admin';});
    $('#member-tab-admin',dialog).hidden=state.user.role!=='admin';
    const forced=Boolean(state.user.mustChangePassword);
    $('.member-close',dialog).hidden=forced;
    $('.member-required',dialog).hidden=!forced;
    $$('[data-tab]',dialog).forEach(button=>{button.disabled=forced&&button.dataset.tab!=='profile';});
    $('#member-title',dialog).textContent=t(state.currentTab==='admin'?'adminTitle':state.currentTab==='profile'?'profileTitle':'chatTitle');
  }
  function makeAvatar(name){const avatar=document.createElement('span');avatar.className='member-avatar';avatar.setAttribute('aria-hidden','true');avatar.textContent=String(name).trim().slice(0,2).toLocaleUpperCase();return avatar;}
  function memberForRoom(){return state.members.find(user=>String(user.id)===String(state.room));}
  function roomName(){return state.room==='all'?t('general'):(memberForRoom()?.displayName||t('loading'));}
  function renderRooms(){
    ui.roomList.replaceChildren();ui.roomSelect.replaceChildren();
    const rooms=[{id:'all',displayName:t('general'),username:'',role:'general'},...state.members.filter(user=>user.id!==state.user?.id)];
    rooms.forEach(room=>{
      const id=String(room.id),button=document.createElement('button');button.type='button';button.className='member-room'+(id==='all'?' is-general':'')+(room.role==='admin'?' is-admin':'');button.setAttribute('aria-current',String(id===String(state.room)));
      const avatar=makeAvatar(room.displayName);if(id==='all')avatar.textContent='#';
      const copy=document.createElement('span');copy.className='member-room-name';copy.textContent=room.displayName;
      const small=document.createElement('small');small.textContent=id==='all'?t('chat'):room.role==='admin'?t('roleAdmin'):'@'+room.username;copy.append(small);button.append(avatar,copy);
      const count=state.unread.get(id)||0;if(count){const badge=document.createElement('span');badge.className='member-unread';badge.textContent=count>99?'99+':String(count);badge.setAttribute('aria-label',count+' '+t('unread'));button.append(badge);}
      button.addEventListener('click',()=>selectRoom(id));ui.roomList.append(button);
      const option=document.createElement('option');option.value=id;option.textContent=room.displayName+(count?' ('+count+')':'');option.selected=id===String(state.room);ui.roomSelect.append(option);
    });
    $('.member-room-footer',dialog).textContent=state.members.length+' '+t('members');
    $('.member-chat-title',dialog).textContent=roomName();
    $('.member-chat-description',dialog).textContent=t(state.room==='all'?'generalHint':'privateHint');
    updateUnread();
  }
  function updateUnread(){let total=0;state.unread.forEach(value=>{total+=value;});const badge=$('#member-chat-unread');if(badge){badge.textContent=total>99?'99+':String(total);badge.hidden=!total;badge.setAttribute('aria-label',total+' '+t('unread'));}}
  async function loadMembers(){
    if(state.user?.mustChangePassword)return;
    const data=await api('/api/members');state.members=data.users;
    if(state.room!=='all'&&!memberForRoom()){state.room='all';state.messages.clear();state.roomVersion++;status(ui.chatStatus,t('roomUnavailable'));if(dialog.open&&state.currentTab==='chat')await loadMessages();}
    renderRooms();
  }
  function belongs(message,room=state.room){
    if(room==='all')return message.recipientId===null;
    const peer=Number(room);return message.recipientId!==null&&((message.senderId===state.user.id&&message.recipientId===peer)||(message.senderId===peer&&message.recipientId===state.user.id));
  }
  function sortedMessages(){return [...state.messages.values()].sort((a,b)=>a.id-b.id);}
  function timestamp(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return '';return new Intl.DateTimeFormat(lang()==='uz'?'uz-UZ':lang()==='ru'?'ru-RU':'en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);}
  function renderMessages({preserveScroll=false,toBottom=false}={}){
    const previous=ui.scroll.scrollTop;ui.messages.replaceChildren();
    const messages=sortedMessages();
    if(!messages.length){const empty=document.createElement('div');empty.className='member-empty';const symbol=document.createElement('span');symbol.className='member-empty-mark';symbol.textContent='···';symbol.setAttribute('aria-hidden','true');const title=document.createElement('strong');title.textContent=t(state.loadingMessages?'loading':'emptyTitle');const hint=document.createElement('span');hint.textContent=state.loadingMessages?'':t('emptyHint');empty.append(symbol,title,hint);ui.messages.append(empty);}
    messages.forEach(message=>{
      const article=document.createElement('article');article.className='member-message'+(message.senderId===state.user?.id?' is-own':'');article.dataset.messageId=String(message.id);
      const meta=document.createElement('div');meta.className='member-message-meta';const author=document.createElement('span');author.className='member-message-author';author.textContent=message.senderId===state.user.id?t('you'):message.senderName;
      const time=document.createElement('time');time.dateTime=String(message.createdAt);time.textContent=timestamp(message.createdAt);meta.append(author,time);
      const body=document.createElement('p');body.className='member-message-text';body.textContent=message.body;article.append(meta,body);
      if(state.user.role==='admin'){const remove=document.createElement('button');remove.className='member-message-delete';remove.type='button';remove.textContent=t('delete');remove.addEventListener('click',async()=>{if(!window.confirm(t('deleteConfirm')))return;remove.disabled=true;try{await api('/api/admin/messages/'+message.id,{method:'DELETE'});state.messages.delete(message.id);renderMessages({preserveScroll:true});status(ui.chatStatus,t('messageRemoved'));}catch(error){status(ui.chatStatus,errorText(error),true);remove.disabled=false;}});article.append(remove);}
      ui.messages.append(article);
    });
    ui.older.hidden=!state.hasMore;
    if(toBottom)ui.scroll.scrollTop=ui.scroll.scrollHeight;
    else if(preserveScroll)ui.scroll.scrollTop=previous;
  }
  async function loadMessages({older=false,catchup=false}={}){
    if(!state.user||state.user.mustChangePassword)return;
    const version=state.roomVersion,room=state.room,current=sortedMessages();
    const params=new URLSearchParams({peer:String(room)});
    if(older&&current.length)params.set('before',String(current[0].id));
    if(catchup&&current.length)params.set('after',String(current[current.length-1].id));
    if(!older&&!catchup){state.loadingMessages=true;renderMessages({preserveScroll:true});}
    const oldHeight=ui.scroll.scrollHeight,oldTop=ui.scroll.scrollTop;
    try{
      const data=await api('/api/messages?'+params.toString());
      if(version!==state.roomVersion)return;
      data.messages.forEach(message=>{if(belongs(message,room))state.messages.set(message.id,message);});
      if(!catchup)state.hasMore=Boolean(data.hasMore);
      state.loadingMessages=false;renderMessages({preserveScroll:catchup,toBottom:!older&&!catchup});
      if(older)ui.scroll.scrollTop=ui.scroll.scrollHeight-oldHeight+oldTop;
      if(catchup&&data.hasMore&&data.messages.length)await loadMessages({catchup:true});
    }catch(error){if(version===state.roomVersion){state.loadingMessages=false;renderMessages({preserveScroll:true});status(ui.chatStatus,errorText(error),true);}}
  }
  async function selectRoom(room){
    if(String(room)===String(state.room))return;
    state.room=String(room);state.roomVersion++;state.messages.clear();state.hasMore=false;state.unread.delete(String(room));status(ui.chatStatus,'');renderRooms();await loadMessages();
  }
  function renderConnection(){const node=$('.member-connection',dialog);node.textContent=t(state.connection);node.classList.toggle('is-connected',state.connection==='connected');}
  function stopEvents(){if(state.eventSource){state.eventSource.close();state.eventSource=null;}state.connection='offline';renderConnection();}
  function connectEvents(){
    if(state.eventSource||!state.user||state.user.mustChangePassword)return;
    const source=new EventSource('/api/events');state.eventSource=source;state.connection='connecting';renderConnection();let firstOpen=true;
    source.addEventListener('open',()=>{if(state.eventSource!==source)return;state.connection='connected';renderConnection();if(!firstOpen)loadMessages({catchup:true});firstOpen=false;});
    source.addEventListener('error',()=>{if(state.eventSource!==source)return;state.connection='connecting';renderConnection();});
    source.addEventListener('message',event=>{
      let message;try{message=JSON.parse(event.data);}catch{return;}
      if(!Number.isInteger(message.id)||typeof message.body!=='string')return;
      const room=message.recipientId===null?'all':String(message.senderId===state.user.id?message.recipientId:message.senderId);
      const visible=dialog.open&&state.currentTab==='chat'&&room===String(state.room);
      if(belongs(message)){const atBottom=ui.scroll.scrollHeight-ui.scroll.scrollTop-ui.scroll.clientHeight<100;state.messages.set(message.id,message);renderMessages({preserveScroll:!atBottom,toBottom:atBottom});}
      if(!visible&&message.senderId!==state.user.id)state.unread.set(room,(state.unread.get(room)||0)+1);
      renderRooms();
    });
    source.addEventListener('message-deleted',event=>{try{const data=JSON.parse(event.data);state.messages.delete(Number(data.id));renderMessages({preserveScroll:true});}catch{}});
    source.addEventListener('users-changed',()=>{loadMembers().catch(error=>status(ui.chatStatus,errorText(error),true));if(state.currentTab==='admin'&&dialog.open)loadAdmin({preserveEditor:true}).catch(error=>status(ui.adminStatus,errorText(error),true));});
    source.addEventListener('session-revoked',()=>{if(!state.changingPassword)redirectLogin();});
  }
  async function showTab(tab){
    if(!state.user)return;
    if(state.user.mustChangePassword)tab='profile';
    if(tab==='admin'&&state.user.role!=='admin')tab='chat';
    state.currentTab=tab;
    $$('[data-tab]',dialog).forEach(button=>{const active=button.dataset.tab===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    $$('.member-panel',dialog).forEach(panel=>{panel.hidden=panel.id!=='member-panel-'+tab;});renderIdentity();
    if(tab==='chat'){
      state.unread.delete(String(state.room));renderRooms();
      try{if(!state.members.length)await loadMembers();await loadMessages({catchup:state.messages.size>0});}catch(error){status(ui.chatStatus,errorText(error),true);}
    }
    if(tab==='admin')try{await loadAdmin();}catch(error){status(ui.adminStatus,errorText(error),true);}
  }
  async function open(tab='chat'){
    try{await ready;}catch{return;}
    if(!state.user)return;
    if(!dialog.open){state.lastTrigger=document.activeElement;dialog.showModal();document.body.classList.add('member-dialog-open');}
    await showTab(['chat','admin','profile'].includes(tab)?tab:'chat');
    requestAnimationFrame(()=>{if(!dialog.open)return;if(state.user.mustChangePassword)ui.passwordForm.elements.currentPassword.focus();else $('[data-tab="'+state.currentTab+'"]',dialog).focus();});
  }
  async function refreshSession(){const data=await api('/api/session');state.user=data.user;renderIdentity();return data;}
  function renderAdminList(){
    const list=$('.member-admin-list',dialog),query=$('#member-user-search',dialog).value.trim().toLocaleLowerCase();list.replaceChildren();
    const users=state.adminUsers.filter(user=>(user.username+' '+user.displayName).toLocaleLowerCase().includes(query));
    users.forEach(user=>{const button=document.createElement('button');button.type='button';button.className='member-user-row'+(!user.active?' is-inactive':'');button.setAttribute('aria-current',String(user.id===state.selectedUser&&!state.creating));
      const avatar=makeAvatar(user.displayName);const name=document.createElement('span');name.className='member-user-name';name.textContent=user.displayName;const small=document.createElement('small');small.textContent='@'+user.username+' · '+t(user.role==='admin'?'adminRole':'userRole');name.append(small);const active=document.createElement('span');active.className='member-user-state';active.textContent=t(user.active?'active':'inactive');button.append(avatar,name,active);button.addEventListener('click',()=>{state.selectedUser=user.id;state.creating=false;status(ui.adminStatus,'');renderAdminList();fillEditor(user);});list.append(button);
    });
    if(!users.length){const empty=document.createElement('p');empty.className='member-small-note';empty.textContent=t('noUsers');list.append(empty);}
  }
  function renderEditorLabels(){
    $('#member-editor-title',dialog).textContent=t(state.creating?'createTitle':'editTitle');
    $('.member-save-user',dialog).textContent=t(state.creating?'createUser':'saveUser');
  }
  function fillEditor(user=null){
    ui.userForm.reset();ui.resetForm.reset();
    const creating=state.creating;
    ui.userForm.elements.username.value=user?.username||'';
    ui.userForm.elements.displayName.value=user?.displayName||'';
    ui.userForm.elements.active.checked=Boolean(user?.active);
    ui.userForm.elements.active.disabled=user?.id===state.user?.id;
    ui.userForm.elements.password.required=creating;
    ui.userForm.elements.password.disabled=!creating;
    $('.member-create-password',dialog).hidden=!creating;
    $('.member-active-field',dialog).hidden=creating;
    $('.member-reset-section',dialog).hidden=creating||!user;
    const self=user?.id===state.user?.id;
    ui.resetForm.hidden=self;
    $('.member-self-password-note',dialog).hidden=!self;
    ui.userForm.hidden=!creating&&!user;
    renderEditorLabels();
  }
  async function loadAdmin({preserveEditor=false}={}){
    if(state.user?.role!=='admin')return;
    const data=await api('/api/admin/users');state.adminUsers=data.users;
    $('#member-stat-total',dialog).textContent=String(data.stats.totalUsers);
    $('#member-stat-active',dialog).textContent=String(data.stats.activeUsers);
    $('#member-stat-messages',dialog).textContent=String(data.stats.totalMessages);
    if(!state.selectedUser&&!state.creating)state.selectedUser=data.users[0]?.id||null;
    renderAdminList();
    if(!preserveEditor||!state.adminLoaded){fillEditor(data.users.find(user=>user.id===state.selectedUser)||null);}
    state.adminLoaded=true;
  }
  async function logout(){
    stopEvents();
    try{await api('/api/logout',{method:'POST',body:'{}'});window.location.assign('/login');}
    catch(error){connectEvents();if(dialog.open)status(state.currentTab==='chat'?ui.chatStatus:state.currentTab==='admin'?ui.adminStatus:ui.profileStatus,errorText(error),true);else showBootstrapError();}
  }
  function showBootstrapError(){
    let notice=$('#member-bootstrap-error');
    if(!notice){notice=document.createElement('div');notice.id='member-bootstrap-error';notice.className='member-bootstrap-notice';notice.dataset.i18nSkip='';notice.setAttribute('role','alert');document.body.append(notice);}
    notice.replaceChildren();const copy=document.createElement('div');copy.textContent=t('networkError');const retry=document.createElement('button');retry.type='button';retry.textContent=t('retry');retry.addEventListener('click',()=>{notice.remove();ready=initialize();ready.catch(()=>{});ready.catch(()=>{});});notice.append(copy,retry);
  }
  dialog.addEventListener('cancel',event=>{if(state.user?.mustChangePassword)event.preventDefault();});
  dialog.addEventListener('click',event=>{if(event.target!==dialog||state.user?.mustChangePassword)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{document.body.classList.remove('member-dialog-open');if(state.lastTrigger?.isConnected)state.lastTrigger.focus({preventScroll:true});});
  $('.member-close',dialog).addEventListener('click',()=>{if(!state.user?.mustChangePassword)dialog.close();});
  $('.member-signout',dialog).addEventListener('click',logout);
  $$('[data-tab]',dialog).forEach(button=>button.addEventListener('click',()=>showTab(button.dataset.tab)));
  $('.member-tabs',dialog).addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!event.target.matches('[data-tab]'))return;event.preventDefault();const tabs=$$('[data-tab]',dialog).filter(button=>!button.hidden&&!button.disabled);let index=tabs.indexOf(document.activeElement);index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[index]?.focus();tabs[index]?.click();});
  document.addEventListener('click',event=>{const openButton=event.target.closest('[data-member-open]');if(openButton){event.preventDefault();open(openButton.dataset.memberOpen);}if(event.target.closest('[data-member-logout]')){event.preventDefault();logout();}});
  ui.roomSelect.addEventListener('change',()=>selectRoom(ui.roomSelect.value));
  $('.member-older',dialog).addEventListener('click',async event=>{event.currentTarget.disabled=true;try{await loadMessages({older:true});}finally{event.currentTarget.disabled=false;}});
  ui.message.addEventListener('input',()=>{$('.member-char-count',dialog).textContent=ui.message.value.length+' / 2000';ui.message.style.height='auto';ui.message.style.height=Math.min(ui.message.scrollHeight,110)+'px';});
  ui.message.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();ui.composer.requestSubmit();}});
  ui.composer.addEventListener('submit',async event=>{
    event.preventDefault();const body=ui.message.value.trim();if(!body||body.length>2000){status(ui.chatStatus,t('invalidMessage'),true);return;}
    const button=$('.member-send',dialog);if(button.disabled)return;button.disabled=true;
    const room=state.room,version=state.roomVersion,original=ui.message.value;
    try{const data=await api('/api/messages',{method:'POST',body:JSON.stringify({recipientId:room==='all'?null:Number(room),body})});
      if(version===state.roomVersion){state.messages.set(data.message.id,data.message);renderMessages({toBottom:true});if(ui.message.value===original){ui.message.value='';ui.message.dispatchEvent(new Event('input'));}status(ui.chatStatus,'');}
    }catch(error){status(ui.chatStatus,errorText(error),true);}finally{button.disabled=false;}
  });
  $$('[data-password-toggle]',dialog).forEach(button=>button.addEventListener('click',()=>{const input=$('input',button.parentElement);input.type=input.type==='password'?'text':'password';button.textContent=t(input.type==='text'?'hide':'show');button.setAttribute('aria-pressed',String(input.type==='text'));}));
  ui.passwordForm.addEventListener('submit',async event=>{
    event.preventDefault();const form=ui.passwordForm,data=new FormData(form),currentPassword=String(data.get('currentPassword')),newPassword=String(data.get('newPassword')),confirm=String(data.get('confirmPassword'));
    if(newPassword!==confirm){status(ui.profileStatus,t('passwordMismatch'),true);return;}
    if(newPassword===currentPassword){status(ui.profileStatus,t('passwordSame'),true);return;}
    if(newPassword.length<12||newPassword.length>128){status(ui.profileStatus,t('passwordLength'),true);return;}
    const button=$('[type="submit"]',form);button.disabled=true;state.changingPassword=true;
    try{const result=await api('/api/password',{method:'POST',body:JSON.stringify({currentPassword,newPassword})});state.user=result.user;stopEvents();connectEvents();form.reset();$$('input',form).forEach(input=>input.type='password');renderIdentity();translate();status(ui.profileStatus,t('passwordUpdated'));loadMembers().catch(error=>status(ui.chatStatus,errorText(error),true));}
    catch(error){status(ui.profileStatus,errorText(error),true);}finally{state.changingPassword=false;button.disabled=false;}
  });
  $('#member-user-search',dialog).addEventListener('input',renderAdminList);
  $('.member-add-user',dialog).addEventListener('click',()=>{state.creating=true;state.selectedUser=null;status(ui.adminStatus,'');renderAdminList();fillEditor();ui.userForm.elements.username.focus();});
  ui.userForm.addEventListener('submit',async event=>{
    event.preventDefault();const data=new FormData(ui.userForm),creating=state.creating,id=state.selectedUser;
    const payload={username:String(data.get('username')).trim(),displayName:String(data.get('displayName')).trim()};
    if(!/^[a-zA-Z0-9_.-]{3,32}$/.test(payload.username)){status(ui.adminStatus,t('invalidUsername'),true);return;}
    if(!payload.displayName||payload.displayName.length>80){status(ui.adminStatus,t('invalidName'),true);return;}
    if(creating)payload.password=String(data.get('password'));
    else payload.active=ui.userForm.elements.active.checked;
    const button=$('[type="submit"]',ui.userForm);button.disabled=true;
    try{const result=await api(creating?'/api/admin/users':'/api/admin/users/'+id,{method:creating?'POST':'PATCH',body:JSON.stringify(payload)});state.selectedUser=result.user.id;state.creating=false;await loadAdmin();await loadMembers();if(result.user.id===state.user.id)await refreshSession();status(ui.adminStatus,t(creating?'userCreated':'userSaved'));}
    catch(error){status(ui.adminStatus,errorText(error),true);}finally{button.disabled=false;}
  });
  ui.resetForm.addEventListener('submit',async event=>{
    event.preventDefault();const button=$('[type="submit"]',ui.resetForm);button.disabled=true;
    try{await api('/api/admin/users/'+state.selectedUser+'/password',{method:'POST',body:JSON.stringify({password:ui.resetForm.elements.password.value})});ui.resetForm.reset();status(ui.adminStatus,t('passwordReset'));await loadAdmin({preserveEditor:true});}
    catch(error){status(ui.adminStatus,errorText(error),true);}finally{button.disabled=false;}
  });
  document.addEventListener('site-language-change',translate);
  window.addEventListener('pagehide',stopEvents);
  window.addEventListener('pageshow',event=>{if(event.persisted)refreshSession().then(()=>{connectEvents();loadMessages({catchup:true});}).catch(showBootstrapError);});
  function initialize(){
    return refreshSession().then(()=>{
      translate();
      if(state.user.mustChangePassword)queueMicrotask(()=>open('profile'));
      else{connectEvents();loadMembers().catch(error=>status(ui.chatStatus,errorText(error),true));}
    }).catch(error=>{if(error.status!==401)showBootstrapError();throw error;});
  }
  let ready=initialize();
  // Keep initialization rejection observed even before the first user interaction.
  ready.catch(()=>{});
  window.MemberPortal={open,refresh:()=>{ready=initialize();ready.catch(()=>{});return ready;},get ready(){return ready;},get user(){return state.user?{...state.user}:null;}};
  translate();
})();
