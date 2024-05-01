local newdecoder = require 'lunajson_decoder'
local newencoder = require 'lunajson_encoder'
local sax = require 'lunajson_sax'
-- If you need multiple contexts of decoder and/or encoder,
-- you can require lunajson.decoder and/or lunajson.encoder directly.
return {
	decode = newdecoder(),
	encode = newencoder(),
	newparser = sax.newparser,
	newfileparser = sax.newfileparser,
}
