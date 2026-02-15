<!DOCTYPE html>
<html lang="en">
<head>
    <title>Flaticon Webfont</title>
    <link rel="stylesheet" type="text/css" href="flaticon_xeno.css"/>
    <meta charset="UTF-8">
    <style>
        html, body, div, span, applet, object, iframe,
        h1, h2, h3, h4, h5, h6, p, blockquote, pre,
        a, abbr, acronym, address, big, cite, code,
        del, dfn, em, img, ins, kbd, q, s, samp,
        small, strike, strong, sub, sup, tt, var,
        b, u, i, center,
        dl, dt, dd, ol, ul, li,
        fieldset, form, label, legend,
        table, caption, tbody, tfoot, thead, tr, th, td,
        article, aside, canvas, details, embed,
        figure, figcaption, footer, header, hgroup,
        menu, nav, output, ruby, section, summary,
        time, mark, audio, video {
            margin: 0;
            padding: 0;
            border: 0;
            font-size: 100%;
            font: inherit;
            vertical-align: baseline;
        }

        /* HTML5 display-role reset for older browsers */
        article, aside, details, figcaption, figure,
        footer, header, hgroup, menu, nav, section {
            display: block;
        }

        body {
            line-height: 1;
        }

        ol, ul {
            list-style: none;
        }

        blockquote, q {
            quotes: none;
        }

        blockquote:before, blockquote:after,
        q:before, q:after {
            content: '';
            content: none;
        }

        table {
            border-collapse: collapse;
            border-spacing: 0;
        }

        body {
            font-family: Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 15px;
            line-height: 1.6;
            color: #777777;
        }

        a {
            color: #52D999;
            font-weight: bold;
            text-decoration: none;
        }

        * {
            -moz-box-sizing: border-box;
            -webkit-box-sizing: border-box;
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        [class^="flaticon-"]:before, [class*=" flaticon-"]:before, [class^="flaticon-"]:after, [class*=" flaticon-"]:after {
            font-family: Flaticon;
            font-size: 32px;
            line-height: 1.25;
            font-style: normal;
            margin-left: 20px;
            color: #424242;
        }

        .wrapper {
            max-width: 600px;
            margin: auto;
            padding: 0 1em;
        }

        .title {
            margin-bottom: 24px;
            text-transform: uppercase;
            font-weight: bold;
        }

        header {
            text-align: center;
            padding: 24px;
        }

        header .logo {
            height: auto;
            border: none;
            display: inline-block;
        }

        header strong {
            font-size: 24px;
            line-height: 1.25;
            font-weight: 500;
            vertical-align: middle;
        }

        .demo {
            margin: 2em auto;
            line-height: 1.25;
        }

        .demo ul li {
            margin-bottom: 12px;
        }

        .demo ul li code {
            background-color: #121212;
            border-radius: 3px;
            padding: 12px;
            display: inline-block;
            color: #fff;
            font-family: Consolas, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
            font-weight: lighter;
            margin-top: 12px;
            font-size: 13px;
            word-break: break-all;
        }

        .demo ul li code .red {
            color: #EB644C;
        }

        .demo ul li code .green {
            color: #52D999;
        }

        .demo ul li code .yellow {
            color: #FFF4D9;
        }

        .demo ul li code .blue {
            color: #648EEF;
        }

        .demo ul li code .purple {
            color: #6569BD;
        }

        .demo ul li code .dots {
            margin-top: 0.5em;
            display: block;
        }

        #glyphs {
            border-bottom: 1px solid #E5E5E5;
            padding: 2em 0;
            text-align: center;
        }

        .glyph {
            display: inline-block;
            width: 9em;
            margin: 1em;
            text-align: center;
            vertical-align: top;
            background: #FFF;
        }

        .glyph .flaticon {
            padding: 10px;
            display: block;
            font-family: "Flaticon";
            font-size: 64px;
            line-height: 1;
        }

        .glyph .flaticon:before {
            font-size: 64px;
            color: #777777;
            margin-left: 0;
        }

        .class-name {
            font-size: 0.65em;
            background-color: #E5E5E5;
            color: #9C9C9C;
            border-radius: 4px 4px 0 0;
            padding: 0.5em;
            font-family: Consolas, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
        }

        .author-name {
            font-size: 0.6em;
            background-color: #EFF3F6;
            border-top: 0;
            border-radius: 0 0 4px 4px;
            padding: 0.5em;
        }

        .author-name a {
            color: #121212;
        }

        .class-name:last-child {
            font-size: 10px;
            line-height: 1.75;
            color: #888;
        }

        .class-name:last-child a {
            font-size: 10px;
            line-height: 1.75;
            color: #555;
        }

        .glyph > input {
            display: block;
            width: 100px;
            margin: 5px auto;
            text-align: center;
            font-size: 12px;
            line-height: 1.75;
            cursor: text;
        }

        .glyph > input.icon-input {
            font-family: "Flaticon";
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 10px;
        }

        .attribution .title {
            margin-top: 2em;
        }

        .attribution textarea {
            background-color: #F8FAFB;
            color: #121212;
            padding: 1em;
            border: none;
            box-shadow: none;
            border: 1px solid #E5E5E5;
            border-radius: 4px;
            resize: none;
            width: 100%;
            height: 150px;
            font-size: 13px;
            line-height: 1.6;
            font-family: Consolas, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
            -webkit-appearance: none;
        }

        .attribution textarea:hover {
            border-color: #CFD9E0;
        }

        .attribution textarea:focus {
            border-color: #52D999;
        }

        .iconsuse {
            margin: 2em auto;
            text-align: center;
            max-width: 1200px;
        }

        .iconsuse:after {
            content: '';
            display: table;
            clear: both;
        }

        .iconsuse .image {
            float: left;
            width: 25%;
            padding: 0 1em;
        }

        .iconsuse .image p {
            margin-bottom: 1em;
        }

        .iconsuse .image span {
            display: block;
            font-size: 0.65em;
            background-color: #222;
            color: #fff;
            border-radius: 4px;
            padding: 10px;
            color: #FFFF99;
            margin-top: 1em;
            font-family: Consolas, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
        }

        .flaticon:before {
            color: #777777;
        }

        #footer {
            text-align: center;
            background-color: #121212;
            color: #9C9C9C;
            padding: 12px;
            font-size: 13px;
            line-height: 1.6;
        }

        #footer a {
            font-weight: normal;
        }

        @media (max-width: 960px) {
            .iconsuse .image {
                width: 50%;
            }
        }

        .preview {
            width: 100px;
            display: inline-block;
            margin: 10px;
        }

        .preview .inner {
            display: inline-block;
            width: 100%;
            text-align: center;
            background: #F7F7F7;
            -webkit-border-radius: 3px 3px 0 0;
            -moz-border-radius: 3px 3px 0 0;
            border-radius: 3px 3px 0 0;
        }

        .preview .inner  {
            line-height: 85px;
            font-size: 40px;
            color: #424242;
        }

        .label {
            display: inline-block;
            width: 100%;
            box-sizing: border-box;
            padding: 5px;
            font-size: 10px;
            font-family: Monaco, monospace;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            background: #ddd;
            -webkit-border-radius: 0 0 3px 3px;
            -moz-border-radius: 0 0 3px 3px;
            border-radius: 0 0 3px 3px;
            color: #777;
        }
    </style>
</head>
<body>
    <header>
        <a href="https://www.flaticon.com/" target="_blank" class="logo">
            <img src="https://www.flaticon.com/media/dist/min/img/logos/flaticon-by-positive-hor.svg" alt="logo">
        </a>
    </header>
    <section class="demo wrapper">

        <p class="title">Webfont Instructions</p>

        <ul>
            <li>
                <span class="num">1. </span>Copy the "Fonts" files and CSS files to your website CSS folder.
            </li>
            <li>
                <span class="num">2. </span>Add the CSS link to your website source code on header.
                <code class="big">
                    &lt;<span class="red">head</span>&gt;
                    <br/><span class="dots">...</span>
                    <br/>&lt;<span class="red">link</span> <span class="green">rel</span>=<span
                        class="yellow">"stylesheet"</span> <span class="green">type</span>=<span
                        class="yellow">"text/css"</span> <span class="green">href</span>=<span class="yellow">"your_website_domain/css_root/flaticon_collection_name.css"</span>&gt;
                    <br/><span class="dots">...</span>
                    <br/>&lt;/<span class="red">head</span>&gt;
                </code>
            </li>

            <li>
                <p>
                    <span class="num">3. </span>Use the icon class on <code>"<span class="blue">display</span>:<span
                        class="purple"> inline</span>"</code> elements:
                    <br/>
                    Use example: <code>&lt;<span class="red">i</span> <span class="green">class</span>=<span class="yellow">&quot;flaticon-airplane49&quot;</span>&gt;&lt;/<span
                        class="red">i</span>&gt;</code> or <code>&lt;<span class="red">span</span> <span
                        class="green">class</span>=<span class="yellow">&quot;flaticon-airplane49&quot;</span>&gt;&lt;/<span
                        class="red">span</span>&gt;</code>
            </li>
        </ul>

    </section>
    <section id="glyphs">
            <div class="glyph">
                <i class="flaticon flaticon-verified"></i>
                <div class="class-name">.flaticon-verified</div>
                <div class="author-name">Author: #author-link-flaticon-verified# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-full-time"></i>
                <div class="class-name">.flaticon-full-time</div>
                <div class="author-name">Author: #author-link-flaticon-full-time# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-industry"></i>
                <div class="class-name">.flaticon-industry</div>
                <div class="author-name">Author: #author-link-flaticon-industry# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-best-customer-experience"></i>
                <div class="class-name">.flaticon-best-customer-experience</div>
                <div class="author-name">Author: #author-link-flaticon-best-customer-experience# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-team"></i>
                <div class="class-name">.flaticon-team</div>
                <div class="author-name">Author: #author-link-flaticon-team# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-solution"></i>
                <div class="class-name">.flaticon-solution</div>
                <div class="author-name">Author: #author-link-flaticon-solution# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-tech-service"></i>
                <div class="class-name">.flaticon-tech-service</div>
                <div class="author-name">Author: #author-link-flaticon-tech-service# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-big-data-analytics"></i>
                <div class="class-name">.flaticon-big-data-analytics</div>
                <div class="author-name">Author: #author-link-flaticon-big-data-analytics# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-pin"></i>
                <div class="class-name">.flaticon-pin</div>
                <div class="author-name">Author: #author-link-flaticon-pin# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-left-quote"></i>
                <div class="class-name">.flaticon-left-quote</div>
                <div class="author-name">Author: #author-link-flaticon-left-quote# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-excellent"></i>
                <div class="class-name">.flaticon-excellent</div>
                <div class="author-name">Author: #author-link-flaticon-excellent# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-targeted"></i>
                <div class="class-name">.flaticon-targeted</div>
                <div class="author-name">Author: #author-link-flaticon-targeted# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-computer"></i>
                <div class="class-name">.flaticon-computer</div>
                <div class="author-name">Author: #author-link-flaticon-computer# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-artificial-intelligence-robot-maintenance"></i>
                <div class="class-name">.flaticon-artificial-intelligence-robot-maintenance</div>
                <div class="author-name">Author: #author-link-flaticon-artificial-intelligence-robot-maintenance# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-solution-1"></i>
                <div class="class-name">.flaticon-solution-1</div>
                <div class="author-name">Author: #author-link-flaticon-solution-1# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-hypothesis"></i>
                <div class="class-name">.flaticon-hypothesis</div>
                <div class="author-name">Author: #author-link-flaticon-hypothesis# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-machine-learning"></i>
                <div class="class-name">.flaticon-machine-learning</div>
                <div class="author-name">Author: #author-link-flaticon-machine-learning# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-asterisk"></i>
                <div class="class-name">.flaticon-asterisk</div>
                <div class="author-name">Author: #author-link-flaticon-asterisk# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-creative-tools"></i>
                <div class="class-name">.flaticon-creative-tools</div>
                <div class="author-name">Author: #author-link-flaticon-creative-tools# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-technology"></i>
                <div class="class-name">.flaticon-technology</div>
                <div class="author-name">Author: #author-link-flaticon-technology# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-chart"></i>
                <div class="class-name">.flaticon-chart</div>
                <div class="author-name">Author: #author-link-flaticon-chart# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-promotion"></i>
                <div class="class-name">.flaticon-promotion</div>
                <div class="author-name">Author: #author-link-flaticon-promotion# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-social-media"></i>
                <div class="class-name">.flaticon-social-media</div>
                <div class="author-name">Author: #author-link-flaticon-social-media# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-digital-marketing"></i>
                <div class="class-name">.flaticon-digital-marketing</div>
                <div class="author-name">Author: #author-link-flaticon-digital-marketing# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-brand"></i>
                <div class="class-name">.flaticon-brand</div>
                <div class="author-name">Author: #author-link-flaticon-brand# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-travel-agency"></i>
                <div class="class-name">.flaticon-travel-agency</div>
                <div class="author-name">Author: #author-link-flaticon-travel-agency# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-advertisig-agency"></i>
                <div class="class-name">.flaticon-advertisig-agency</div>
                <div class="author-name">Author: #author-link-flaticon-advertisig-agency# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-marketing-agent"></i>
                <div class="class-name">.flaticon-marketing-agent</div>
                <div class="author-name">Author: #author-link-flaticon-marketing-agent# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-marketing"></i>
                <div class="class-name">.flaticon-marketing</div>
                <div class="author-name">Author: #author-link-flaticon-marketing# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-select"></i>
                <div class="class-name">.flaticon-select</div>
                <div class="author-name">Author: #author-link-flaticon-select# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-digital-marketing-1"></i>
                <div class="class-name">.flaticon-digital-marketing-1</div>
                <div class="author-name">Author: #author-link-flaticon-digital-marketing-1# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-travel-agent"></i>
                <div class="class-name">.flaticon-travel-agent</div>
                <div class="author-name">Author: #author-link-flaticon-travel-agent# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-content"></i>
                <div class="class-name">.flaticon-content</div>
                <div class="author-name">Author: #author-link-flaticon-content# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-advertising"></i>
                <div class="class-name">.flaticon-advertising</div>
                <div class="author-name">Author: #author-link-flaticon-advertising# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-public-relation"></i>
                <div class="class-name">.flaticon-public-relation</div>
                <div class="author-name">Author: #author-link-flaticon-public-relation# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-relations"></i>
                <div class="class-name">.flaticon-relations</div>
                <div class="author-name">Author: #author-link-flaticon-relations# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-public-relation-1"></i>
                <div class="class-name">.flaticon-public-relation-1</div>
                <div class="author-name">Author: #author-link-flaticon-public-relation-1# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-public-relation-2"></i>
                <div class="class-name">.flaticon-public-relation-2</div>
                <div class="author-name">Author: #author-link-flaticon-public-relation-2# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-document"></i>
                <div class="class-name">.flaticon-document</div>
                <div class="author-name">Author: #author-link-flaticon-document# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-phone-call"></i>
                <div class="class-name">.flaticon-phone-call</div>
                <div class="author-name">Author: #author-link-flaticon-phone-call# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-telephone"></i>
                <div class="class-name">.flaticon-telephone</div>
                <div class="author-name">Author: #author-link-flaticon-telephone# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-email"></i>
                <div class="class-name">.flaticon-email</div>
                <div class="author-name">Author: #author-link-flaticon-email# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-email-1"></i>
                <div class="class-name">.flaticon-email-1</div>
                <div class="author-name">Author: #author-link-flaticon-email-1# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-map"></i>
                <div class="class-name">.flaticon-map</div>
                <div class="author-name">Author: #author-link-flaticon-map# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-placeholder"></i>
                <div class="class-name">.flaticon-placeholder</div>
                <div class="author-name">Author: #author-link-flaticon-placeholder# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-megaphone"></i>
                <div class="class-name">.flaticon-megaphone</div>
                <div class="author-name">Author: #author-link-flaticon-megaphone# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-promotion-1"></i>
                <div class="class-name">.flaticon-promotion-1</div>
                <div class="author-name">Author: #author-link-flaticon-promotion-1# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-front-end-programming"></i>
                <div class="class-name">.flaticon-front-end-programming</div>
                <div class="author-name">Author: #author-link-flaticon-front-end-programming# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-web-design"></i>
                <div class="class-name">.flaticon-web-design</div>
                <div class="author-name">Author: #author-link-flaticon-web-design# </div>
            </div>

            <div class="glyph">
                <i class="flaticon flaticon-public-relation-3"></i>
                <div class="class-name">.flaticon-public-relation-3</div>
                <div class="author-name">Author: #author-link-flaticon-public-relation-3# </div>
            </div>

    </section>

    <section class="attribution wrapper"   style="text-align:center;">

        <div class="title">License and attribution:</div><div class="attrDiv">Font generated by <a href="https://www.flaticon.com">flaticon.com</a>. <div>#allAuthorLinksCC# #allAuthorLinksBasic# </div>
        </div>
        <div class="title">Copy the Attribution License:</div>

        <textarea onclick="this.focus();this.select();">Font generated by &lt;a href=&quot;https://www.flaticon.com&quot;&gt;flaticon.com&lt;/a&gt;. #allAuthorLinksCC# #allAuthorLinksBasic#
        </textarea>

    </section>

    <section class="iconsuse">

        <div class="title">Examples:</div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-verified"></i>
                    <span>&lt;i class=&quot;flaticon-verified&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-full-time"></i>
                    <span>&lt;i class=&quot;flaticon-full-time&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-industry"></i>
                    <span>&lt;i class=&quot;flaticon-industry&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-best-customer-experience"></i>
                    <span>&lt;i class=&quot;flaticon-best-customer-experience&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-team"></i>
                    <span>&lt;i class=&quot;flaticon-team&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-solution"></i>
                    <span>&lt;i class=&quot;flaticon-solution&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-tech-service"></i>
                    <span>&lt;i class=&quot;flaticon-tech-service&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-big-data-analytics"></i>
                    <span>&lt;i class=&quot;flaticon-big-data-analytics&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-pin"></i>
                    <span>&lt;i class=&quot;flaticon-pin&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-left-quote"></i>
                    <span>&lt;i class=&quot;flaticon-left-quote&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-excellent"></i>
                    <span>&lt;i class=&quot;flaticon-excellent&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-targeted"></i>
                    <span>&lt;i class=&quot;flaticon-targeted&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-computer"></i>
                    <span>&lt;i class=&quot;flaticon-computer&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-artificial-intelligence-robot-maintenance"></i>
                    <span>&lt;i class=&quot;flaticon-artificial-intelligence-robot-maintenance&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-solution-1"></i>
                    <span>&lt;i class=&quot;flaticon-solution-1&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-hypothesis"></i>
                    <span>&lt;i class=&quot;flaticon-hypothesis&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-machine-learning"></i>
                    <span>&lt;i class=&quot;flaticon-machine-learning&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-asterisk"></i>
                    <span>&lt;i class=&quot;flaticon-asterisk&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-creative-tools"></i>
                    <span>&lt;i class=&quot;flaticon-creative-tools&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-technology"></i>
                    <span>&lt;i class=&quot;flaticon-technology&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-chart"></i>
                    <span>&lt;i class=&quot;flaticon-chart&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-promotion"></i>
                    <span>&lt;i class=&quot;flaticon-promotion&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-social-media"></i>
                    <span>&lt;i class=&quot;flaticon-social-media&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-digital-marketing"></i>
                    <span>&lt;i class=&quot;flaticon-digital-marketing&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-brand"></i>
                    <span>&lt;i class=&quot;flaticon-brand&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-travel-agency"></i>
                    <span>&lt;i class=&quot;flaticon-travel-agency&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-advertisig-agency"></i>
                    <span>&lt;i class=&quot;flaticon-advertisig-agency&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-marketing-agent"></i>
                    <span>&lt;i class=&quot;flaticon-marketing-agent&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-marketing"></i>
                    <span>&lt;i class=&quot;flaticon-marketing&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-select"></i>
                    <span>&lt;i class=&quot;flaticon-select&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-digital-marketing-1"></i>
                    <span>&lt;i class=&quot;flaticon-digital-marketing-1&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-travel-agent"></i>
                    <span>&lt;i class=&quot;flaticon-travel-agent&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-content"></i>
                    <span>&lt;i class=&quot;flaticon-content&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-advertising"></i>
                    <span>&lt;i class=&quot;flaticon-advertising&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-public-relation"></i>
                    <span>&lt;i class=&quot;flaticon-public-relation&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-relations"></i>
                    <span>&lt;i class=&quot;flaticon-relations&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-public-relation-1"></i>
                    <span>&lt;i class=&quot;flaticon-public-relation-1&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-public-relation-2"></i>
                    <span>&lt;i class=&quot;flaticon-public-relation-2&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-document"></i>
                    <span>&lt;i class=&quot;flaticon-document&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-phone-call"></i>
                    <span>&lt;i class=&quot;flaticon-phone-call&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-telephone"></i>
                    <span>&lt;i class=&quot;flaticon-telephone&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-email"></i>
                    <span>&lt;i class=&quot;flaticon-email&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-email-1"></i>
                    <span>&lt;i class=&quot;flaticon-email-1&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-map"></i>
                    <span>&lt;i class=&quot;flaticon-map&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-placeholder"></i>
                    <span>&lt;i class=&quot;flaticon-placeholder&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-megaphone"></i>
                    <span>&lt;i class=&quot;flaticon-megaphone&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-promotion-1"></i>
                    <span>&lt;i class=&quot;flaticon-promotion-1&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-front-end-programming"></i>
                    <span>&lt;i class=&quot;flaticon-front-end-programming&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-web-design"></i>
                    <span>&lt;i class=&quot;flaticon-web-design&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
            <div class="image">
                <p>
                    <i class="flaticon flaticon-public-relation-3"></i>
                    <span>&lt;i class=&quot;flaticon-public-relation-3&quot;&gt;&lt;/i&gt;</span>
                </p>
            </div>
        </div>

    </section>

    <div id="footer">
        <div>Generated by <a href="https://www.flaticon.com">flaticon.com</a>
        </div>
    </div>

</body>
</html>
