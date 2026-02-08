export const resetPasswordTemplate = (resetUrl: string, token: string) => `
<!--
* This email was built using Tabular.
* For more information, visit https://tabular.email
-->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<title></title>
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<!--[if !mso]>-->
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<!--<![endif]-->
<meta name="x-apple-disable-message-reformatting" content="" />
<meta content="target-densitydpi=device-dpi" name="viewport" />
<meta content="true" name="HandheldFriendly" />
<meta content="width=device-width" name="viewport" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
<style type="text/css">
table {
border-collapse: separate;
table-layout: fixed;
mso-table-lspace: 0pt;
mso-table-rspace: 0pt
}
table td {
border-collapse: collapse
}
.ExternalClass {
width: 100%
}
.ExternalClass,
.ExternalClass p,
.ExternalClass span,
.ExternalClass font,
.ExternalClass td,
.ExternalClass div {
line-height: 100%
}
body, a, li, p, h1, h2, h3 {
-ms-text-size-adjust: 100%;
-webkit-text-size-adjust: 100%;
}
html {
-webkit-text-size-adjust: none !important
}
body {
min-width: 100%;
Margin: 0px;
padding: 0px;
}
body, #innerTable {
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale
}
#innerTable img+div {
display: none;
display: none !important
}
img {
Margin: 0;
padding: 0;
-ms-interpolation-mode: bicubic
}
h1, h2, h3, p, a {
overflow-wrap: normal;
white-space: normal;
word-break: break-word
}
a {
text-decoration: none
}
h1, h2, h3, p {
min-width: 100%!important;
width: 100%!important;
max-width: 100%!important;
display: inline-block!important;
border: 0;
padding: 0;
margin: 0
}
a[x-apple-data-detectors] {
color: inherit !important;
text-decoration: none !important;
font-size: inherit !important;
font-family: inherit !important;
font-weight: inherit !important;
line-height: inherit !important
}
u + #body a {
color: inherit;
text-decoration: none;
font-size: inherit;
font-family: inherit;
font-weight: inherit;
line-height: inherit;
}
a[href^="mailto"],
a[href^="tel"],
a[href^="sms"] {
color: inherit;
text-decoration: none
}
</style>
<style type="text/css">
@media (min-width: 481px) {
.hd { display: none!important }
}
</style>
<style type="text/css">
@media (max-width: 480px) {
.hm { display: none!important }
}
</style>
<style type="text/css">
@media (max-width: 480px) {
.t3,.t55,.t59{vertical-align:top!important}.t76{width:343px!important}.t4{text-align:center!important}.t12{line-height:35px!important;font-size:30px!important}.t3{width:55px!important}.t60{text-align:left!important}.t55{width:585px!important}.t59{width:335px!important}
}
</style>
<!--[if !mso]>-->
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;600;700;900&amp;family=Roboto:wght@400;700&amp;display=swap" rel="stylesheet" type="text/css" />
<!--<![endif]-->
<!--[if mso]>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
<![endif]-->
</head>
<body id=body class=t81 style="min-width:100%;Margin:0px;padding:0px;background-color:#292929;"><div class=t80 style="background-color:#292929;"><table role=presentation width=100% cellpadding=0 cellspacing=0 border=0 align=center><tr><td class=t79 style="font-size:0;line-height:0;mso-line-height-rule:exactly;background-color:#292929;" valign=top align=center>
<!--[if mso]>
<v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false">
<v:fill color=#292929/>
</v:background>
<![endif]-->
<table role=presentation width=100% cellpadding=0 cellspacing=0 border=0 align=center id=innerTable><tr><td><div class=t73 style="mso-line-height-rule:exactly;mso-line-height-alt:60px;line-height:60px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t77 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;"><tr><td width=440 class=t76 style="width:440px;">
<table class=t75 role=presentation cellpadding=0 cellspacing=0 width=100% style="width:100%;"><tr><td class=t74 style="padding:0 20px 0 20px;"><table role=presentation width=100% cellpadding=0 cellspacing=0 style="width:100% !important;"><tr><td align=center>
<table class=t11 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;"><tr><td width=400 class=t10 style="width:800px;">
<table class=t9 role=presentation cellpadding=0 cellspacing=0 width=100% style="width:100%;"><tr><td class=t8 style="overflow:hidden;background-color:#5E5EFF;padding:26px 25px 26px 25px;border-radius:14px 14px 0 0;"><div class=t7 style="width:100%;text-align:center;"><div class=t6 style="display:inline-block;"><table class=t5 role=presentation cellpadding=0 cellspacing=0 align=center valign=top>
<tr class=t4><td></td><td class=t3 width=55 valign=top>
<table role=presentation width=100% cellpadding=0 cellspacing=0 class=t2 style="width:100%;"><tr><td class=t1><div style="font-size:0px;"><img class=t0 style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width=55 height=36 alt="" src="https://04599a11-8f08-4106-b856-30cbf10e9d86.b-cdn.net/e/e1e09c25-466a-4712-9425-51d830b929b8/3902fc90-60f4-41e3-8dbe-c354fa10e04a.png"/></div></td></tr></table>
</td>
<td></td></tr>
</table></div></div></td></tr></table>
</td></tr></table>
</td></tr><tr><td align=center>
<table class=t72 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;"><tr><td width=400 class=t71 style="width:800px;">
<table class=t70 role=presentation cellpadding=0 cellspacing=0 width=100% style="width:100%;"><tr><td class=t69 style="overflow:hidden;background-color:#FFFFFF;padding:40px 40px 24px 40px;border-radius:0 0 14px 14px;"><table role=presentation width=100% cellpadding=0 cellspacing=0 style="width:100% !important;"><tr><td align=center>
<table class=t16 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;"><tr><td width=320 class=t15 style="width:600px;">
<table class=t14 role=presentation cellpadding=0 cellspacing=0 width=100% style="width:100%;"><tr><td class=t13><h1 class=t12 style="margin:0;Margin:0;font-family:Inter Tight,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:41px;font-weight:900;font-style:normal;font-size:35px;text-decoration:none;text-transform:none;direction:ltr;color:#121212;text-align:center;mso-line-height-rule:exactly;mso-text-raise:2px;">Forgot your password?</h1></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class=t18 style="mso-line-height-rule:exactly;mso-line-height-alt:17px;line-height:17px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t22 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;"><tr><td width=320 class=t21 style="width:600px;">
<table class=t20 role=presentation cellpadding=0 cellspacing=0 width=100% style="width:100%;"><tr><td class=t19><p class=t17 style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#111111;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">To reset your password, click the button below. The link will expire after 1 hour.</p></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class=t24 style="mso-line-height-rule:exactly;mso-line-height-alt:17px;line-height:17px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t28 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;"><tr><td width=286 class=t27 style="width:286px;">
<table class=t26 role=presentation cellpadding=0 cellspacing=0 width=100% style="width:100%;"><tr><td class=t25 style="overflow:hidden;background-color:#FF6969;text-align:center;line-height:40px;mso-line-height-rule:exactly;mso-text-raise:8px;border-radius:12px 12px 12px 12px;"><a class=t23 href="${resetUrl}" style="display:block;margin:0;Margin:0;font-family:Inter Tight,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:40px;font-weight:600;font-style:normal;font-size:14px;text-decoration:none;direction:ltr;color:#292929;text-align:center;mso-line-height-rule:exactly;mso-text-raise:8px;" target=_blank>Reset your password</a></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class=t40 style="mso-line-height-rule:exactly;mso-line-height-alt:17px;line-height:17px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t44 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;"><tr><td width=320 class=t43 style="width:600px;">
<table class=t42 role=presentation cellpadding=0 cellspacing=0 width=100% style="width:100%;"><tr><td class=t41><table role=presentation width=100% cellpadding=0 cellspacing=0 style="width:100% !important;"><tr><td align=center>
<table class=t33 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;"><tr><td width=320 class=t32 style="width:600px;">
<table class=t31 role=presentation cellpadding=0 cellspacing=0 width=100% style="width:100%;"><tr><td class=t30><p class=t29 style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">If for some reason the button doesn&#39;t work, enter this code:</p></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class=t34 style="mso-line-height-rule:exactly;mso-line-height-alt:14px;line-height:14px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t39 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;"><tr><td width=176 class=t38 style="width:176px;">
<table class=t37 role=presentation cellpadding=0 cellspacing=0 width=100% style="width:100%;"><tr><td class=t36><p class=t35 style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:45px;font-weight:700;font-style:normal;font-size:40px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">${token}</p></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class=t47 style="mso-line-height-rule:exactly;mso-line-height-alt:17px;line-height:17px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t51 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;"><tr><td width=320 class=t50 style="width:625px;">
<table class=t49 role=presentation cellpadding=0 cellspacing=0 width=100% style="width:100%;"><tr><td class=t48><p class=t46 style="margin:0;Margin:0;font-family:Inter Tight,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:13px;text-decoration:none;text-transform:none;direction:ltr;color:#121212;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">Didn&#39;t request this? <a class=t45 href="mailto:raphaelmenyawovor@gmail.com" style="margin:0;Margin:0;font-weight:700;font-style:normal;text-decoration:none;direction:ltr;color:#0000FF;mso-line-height-rule:exactly;" target=_blank>Let us know.</a></p></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class=t64 style="mso-line-height-rule:exactly;mso-line-height-alt:17px;line-height:17px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t68 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;"><tr><td width=320 class=t67 style="width:600px;">
<table class=t66 role=presentation cellpadding=0 cellspacing=0 width=100% style="width:100%;"><tr><td class=t65><div class=t63 style="width:100%;text-align:left;"><div class=t62 style="display:inline-block;"><table class=t61 role=presentation cellpadding=0 cellspacing=0 align=left valign=top>
<tr class=t60><td></td><td class=t55 width=203.47826 valign=top>
<table role=presentation width=100% cellpadding=0 cellspacing=0 class=t54 style="width:100%;"><tr><td class=t53><p class=t52 style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">© 2026&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</p></td></tr></table>
</td><td class=t59 width=116.52174 valign=top>
<table role=presentation width=100% cellpadding=0 cellspacing=0 class=t58 style="width:100%;"><tr><td class=t57><p class=t56 style="margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Obscura Team</p></td></tr></table>
</td>
<td></td></tr>
</table></div></div></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td></tr></table>
</td></tr></table></td></tr></table>
</td></tr></table>
</td></tr><tr><td><div class=t78 style="mso-line-height-rule:exactly;mso-line-height-alt:60px;line-height:60px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr></table></td></tr></table></div><div class="gmail-fix" style="display: none; white-space: nowrap; font: 15px courier; line-height: 0;">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</div></body>
</html>
`;
