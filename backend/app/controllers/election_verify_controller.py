from app.models.election import Election
from app.models.voter import Voter
from app.models.vote import Vote
from app.models.candidate import Candidate
from app.models.position import Position
from app import db
from flask import jsonify, request


class ElectionVerifyController:
    @staticmethod
    def send_vote_receipt(election_id):
        try:
            data = request.json or {}
            student_id = data.get('student_id')
            if not student_id:
                return jsonify({'error': 'student_id required'}), 400
            
            # Get voter
            voter = Voter.query.get(student_id)
            if not voter:
                return jsonify({'error': 'Voter not found'}), 404
            
            # Get election
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404
            
            # Get votes
            votes = (
                db.session.query(Vote, Candidate, Position)
                .join(Candidate, Vote.candidate_id == Candidate.candidate_id)
                .join(Position, Candidate.position_id == Position.position_id)
                .filter(Vote.election_id == election_id, Vote.student_id == student_id)
                .all()
            )
            if not votes:
                return jsonify({'error': 'No votes found for this voter in this election'}), 404
            
            # Compose email
            from flask_mail import Message
            vote_rows = "".join([
                f"<tr><td style='padding:8px;border:1px solid #eee'>{v[2].position_name}</td>"
                f"<td style='padding:8px;border:1px solid #eee'>{v[1].fullname}</td>"
                f"<td style='padding:8px;border:1px solid #eee'>{v[1].party or ''}</td></tr>"
                for v in votes
            ])
            html = f"""
            <div style='font-family:sans-serif;background:#f9fafb;padding:32px;'>
              <div style='max-width:480px;margin:auto;background:#fff;border-radius:12px;box-shadow:0 2px 8px #0001;padding:32px;'>
                <h2 style='color:#1a202c;text-align:center;margin-bottom:24px;'>Your Vote Receipt</h2>
                <p style='color:#333;text-align:center;'>Thank you for voting in <b>{election.election_name}</b>!</p>
                <table style='width:100%;border-collapse:collapse;margin:24px 0;'>
                  <thead>
                    <tr style='background:#fef9c3;'>
                      <th style='padding:8px;border:1px solid #eee;text-align:left;'>Position</th>
                      <th style='padding:8px;border:1px solid #eee;text-align:left;'>Candidate</th>
                      <th style='padding:8px;border:1px solid #eee;text-align:left;'>Party</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vote_rows}
                  </tbody>
                </table>
                <p style='color:#666;font-size:13px;text-align:center;'>This is your official vote receipt. Please keep it for your records.<br/>If you did not cast this vote, contact the election administrator immediately.</p>
                <div style='text-align:center;margin-top:24px;'>
                  <img src='https://www.usep.edu.ph/wp-content/uploads/2022/09/USEP-Logo-Profile-1.png' alt='USEP Logo' style='width:80px;opacity:0.7;margin:auto;' />
                </div>
              </div>
            </div>
            """
            msg = Message(
                subject=f"Vote Receipt for {election.election_name}",
                recipients=[voter.student_email],
                html=html
            )
            from app import mail
            mail.send(msg)
            
            # Decrement voter_count after successful email sending
            # This indicates the voter has completed their voting session
            if election.voters_count and election.voters_count > 0:
                election.voters_count -= 1
                db.session.commit()
                print(f'DEBUG: Decremented voters_count to {election.voters_count} for election {election_id} after sending receipt to {student_id}')
            
            return jsonify({
                'message': 'Vote receipt sent successfully',
                'voters_count': election.voters_count
            })
            
        except Exception as ex:
            db.session.rollback()
            print('Error in send_vote_receipt:', ex)
            return jsonify({'error': 'Failed to send vote receipt'}), 500

    @staticmethod
    def get_crypto_config(election_id):
        """Get the crypto configuration for an election"""
        try:
            from app.models.crypto_config import CryptoConfig
            
            crypto_config = CryptoConfig.query.filter_by(
                election_id=election_id,
                status='active'
            ).first()
            
            if not crypto_config:
                return jsonify({'error': 'No crypto configuration found for this election'}), 404
                
            return jsonify({
                'crypto_id': crypto_config.crypto_id,
                'public_key': crypto_config.public_key,
                'key_type': crypto_config.key_type,
                'meta_data': crypto_config.meta_data
            }), 200
            
        except Exception as ex:
            print('Error in get_crypto_config:', ex)
            return jsonify({'error': 'Failed to fetch crypto configuration'}), 500
