'use strict';
$$('[data-campaign-welcome]').forEach(button=>button.addEventListener('click',()=>openDialog('#welcomeDialog')));
$$('[data-campaign-gift]').forEach(button=>button.addEventListener('click',()=>openDialog('#giftDialog')));
