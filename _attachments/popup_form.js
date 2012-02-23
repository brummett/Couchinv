function popup_dialog(html) {
    var background = $("#popup_background");

    html = '<div class="popup_dialog">' + html + '</div>';
    var popup = $(html);
    $("body").append(popup);

    var windowWidth = document.documentElement.clientWidth;
    var windowHeight = document.documentElement.clientHeight;
    var popupHeight = popup.height();
    var popupWidth = popup.width();
    //centering
    popup.css({
               "position": "absolute",
               "top": (windowHeight-popupHeight)/3,
               "left": windowWidth/2-popupWidth/2
             });
    popup.fadeIn("fast");
    background.fadeIn("fast");
    return popup;
}


function popup_cleanup(popup) {
    var background = $("#popup_background");
    background.fadeOut("fast");
    popup.fadeOut("fast");
    popup.remove();
}
