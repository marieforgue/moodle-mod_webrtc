<?php

// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Prints a particular instance of webrtc
 *
 * You can have a rather longer description of the file as well,
 * if you like, and it can span multiple lines.
 *
 * @package    mod_webrtc
 * @copyright  2011 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/// (Replace webrtc with the name of your module and remove this line)

require_once(dirname(dirname(dirname(__FILE__))).'/config.php');
require_once(dirname(__FILE__).'/lib.php');

$id = optional_param('id', 0, PARAM_INT); // course_module ID, or
$n  = optional_param('n', 0, PARAM_INT);  // webrtc instance ID - it should be named as the first character of the module

if ($id) {
    $cm         = get_coursemodule_from_id('webrtc', $id, 0, false, MUST_EXIST);
    $course     = $DB->get_record('course', array('id' => $cm->course), '*', MUST_EXIST);
    $webrtc  = $DB->get_record('webrtc', array('id' => $cm->instance), '*', MUST_EXIST);
} elseif ($n) {
    $webrtc  = $DB->get_record('webrtc', array('id' => $n), '*', MUST_EXIST);
    $course     = $DB->get_record('course', array('id' => $webrtc->course), '*', MUST_EXIST);
    $cm         = get_coursemodule_from_instance('webrtc', $webrtc->id, $course->id, false, MUST_EXIST);
} else {
    error('You must specify a course_module ID or an instance ID');
}

require_login($course, true, $cm);
$context = context_module::instance($cm->id);

add_to_log($course->id, 'webrtc', 'view', "view.php?id={$cm->id}", $webrtc->name, $cm->id);

/// Print the page header

$PAGE->set_url('/mod/webrtc/view.php', array('id' => $cm->id));
$PAGE->set_title(format_string($webrtc->name));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_context($context);

// other things you may want to set - remove if not needed
//$PAGE->set_cacheable(false);
//$PAGE->set_focuscontrol('some-html-id');
//$PAGE->add_body_class('webrtc-'.$somevar);

// Output starts here
echo $OUTPUT->header();
echo '<link rel="stylesheet" href="./css/style.css" />
	<script src="./js/fancywebsocket.js"></script>
    <script src="./js/adapter.js"></script>
    <script src="./js/MyPeerConnection.js"></script>';

if ($webrtc->intro) { // Conditions to show the intro can change to look for own settings or whatever
    echo $OUTPUT->box(format_module_intro('webrtc', $webrtc, $cm->id), 'generalbox mod_introbox', 'webrtcintro');
}

// Replace the following lines with you own code
echo $OUTPUT->heading('Yay! It works!');

$flux = $webrtc->flux;

echo '<script type="text/javascript"> 
      //<![CDATA[ 

      address="'.$flux.'";
      username="'.$USER->username.'";
      console.log("view.php : address=" + address + " username=" + username );

      //]]> 
      </script>';

echo '<section id="video">
      <video id="yourVideo" autoplay="autoplay" controls></video>
      <video id="myVideo" autoplay="autoplay" controls muted="true"></video>
    </section>

    <section id="chat">
    	<div id="log" name="log" ondragover="dragOverHandler(event)" ondrop="dropHandler(event)"></div>
    	<input type="text" name="chatInput" id="chatInput" onkeyup="if (event.keyCode == 13) {sendChat(); return false;}">
    	<button id="sendChat" onclick="sendChat()" disabled>Send</button>
    	<input type="file" name="fileInput" id="fileInput" onchange="sendFile(this.files)" disabled>
    </section>

    <section id="screen">
      <video id="yourScreen" autoplay="autoplay" controls muted="true"></video>
      <video id="myScreen" autoplay="autoplay" controls muted="true"></video>
    </section>

    <section id="buttons">
      <button id="buttonShareWebcam" value="pending" onclick="shareWebcam()" disabled>Share my webcam</button>
      <button id="buttonShareScreen" onclick="shareScreen()" disabled>Share my screen</button>
    </section>';

echo '<script src="./js/script.js"></script>';

// Finish the page
echo $OUTPUT->footer();
